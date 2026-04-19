import Foundation
#if canImport(UIKit)
import UIKit
import WebKit
import Darwin

@objc(PrintModule)
class PrintModule: NSObject, NetServiceBrowserDelegate, NetServiceDelegate {
  private let printerServiceTypes = [
    "_pdl-datastream._tcp.",
    "_printer._tcp.",
    "_ipp._tcp.",
    "_ipps._tcp.",
  ]
  private var serviceBrowsers: [NetServiceBrowser] = []
  private var pendingServices: [NetService] = []
  private var discoveredPrinters: [[String: Any]] = []
  private var discoveredPrinterKeys = Set<String>()
  private var discoveryTimer: Timer?
  private var discoveryResolver: RCTPromiseResolveBlock?
  private var discoveryRejecter: RCTPromiseRejectBlock?

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc
  func printToLANPrinter(
    _ html: String,
    printerIP: String,
    printerPort: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let host = printerIP.trimmingCharacters(in: .whitespacesAndNewlines)
    let port = printerPort.intValue

    guard !host.isEmpty else {
      reject("LAN_PRINT_ERROR", "Printer IP or host is empty", nil)
      return
    }
    guard (1...65535).contains(port) else {
      reject("LAN_PRINT_ERROR", "Invalid printer port: \(port)", nil)
      return
    }

    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let escPosData = self.makeEscPosData(from: html)
        try self.sendRawData(escPosData, host: host, port: UInt16(port))
        DispatchQueue.main.async {
          resolve("LAN print completed")
        }
      } catch {
        DispatchQueue.main.async {
          reject("LAN_PRINT_ERROR", error.localizedDescription, error)
        }
      }
    }
  }

  @objc
  func discoverLANPrinters(
    _ timeoutMs: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      if self.discoveryResolver != nil {
        reject("DISCOVERY_BUSY", "Printer discovery is already running", nil)
        return
      }

      self.discoveryResolver = resolve
      self.discoveryRejecter = reject
      self.discoveredPrinters = []
      self.discoveredPrinterKeys.removeAll()
      self.pendingServices = []
      self.stopServiceBrowsers()

      let timeoutSeconds = max(1.0, min(timeoutMs.doubleValue / 1000.0, 15.0))
      self.discoveryTimer = Timer.scheduledTimer(withTimeInterval: timeoutSeconds, repeats: false) { _ in
        self.finishDiscovery()
      }

      for serviceType in self.printerServiceTypes {
        let browser = NetServiceBrowser()
        browser.delegate = self
        browser.searchForServices(ofType: serviceType, inDomain: "local.")
        self.serviceBrowsers.append(browser)
      }
    }
  }

  @objc
  func printHTML(_ html: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let printController = UIPrintInteractionController.shared
      let printInfo = UIPrintInfo(dictionary: nil)
      printInfo.outputType = .general
      printInfo.jobName = "eMenu Receipt"
      printController.printInfo = printInfo

      let formatter = UIMarkupTextPrintFormatter(markupText: html)
      formatter.perPageContentInsets = UIEdgeInsets(top: 20, left: 20, bottom: 20, right: 20)
      printController.printFormatter = formatter

      printController.present(animated: true) { (controller, completed, error) in
        if completed {
          resolve("Print completed")
        } else if let error = error {
          reject("PRINT_ERROR", "Print failed: \(error.localizedDescription)", error)
        } else {
          resolve("Print cancelled")
        }
      }
    }
  }

  @objc
  func previewHTML(_ html: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let window = UIApplication.shared.connectedScenes
        .compactMap({ $0 as? UIWindowScene })
        .flatMap({ $0.windows })
        .first(where: { $0.isKeyWindow }),
        let rootVC = window.rootViewController else {
        reject("PREVIEW_ERROR", "Cannot find root view controller", nil)
        return
      }

      let presentingVC = Self.topMostViewController(from: rootVC)

      let previewController = ReceiptPreviewController(html: html)
      let navigationController = UINavigationController(rootViewController: previewController)
      navigationController.modalPresentationStyle = .fullScreen

      presentingVC.present(navigationController, animated: true) {
        resolve("Preview shown")
      }
    }
  }

  private static func topMostViewController(from root: UIViewController) -> UIViewController {
    var top = root
    while let presented = top.presentedViewController {
      top = presented
    }
    return top
  }

  private func makeEscPosData(from html: String) -> Data {
    let text = plainText(from: html)
    var bytes = Data([0x1B, 0x40]) // Initialize printer
    bytes.append(Data([0x1B, 0x61, 0x00])) // Left align

    if let textData = text.data(using: .utf8) {
      bytes.append(textData)
    }

    bytes.append(Data([0x0A, 0x0A]))
    bytes.append(Data([0x1D, 0x56, 0x00])) // Full cut
    return bytes
  }

  private func plainText(from html: String) -> String {
    var value = html
      .replacingOccurrences(of: "(?i)<br\\s*/?>", with: "\n", options: .regularExpression)
      .replacingOccurrences(of: "(?i)</p>", with: "\n", options: .regularExpression)
      .replacingOccurrences(of: "(?i)</div>", with: "\n", options: .regularExpression)
      .replacingOccurrences(of: "(?i)</tr>", with: "\n", options: .regularExpression)
      .replacingOccurrences(of: "(?i)</h[1-6]>", with: "\n", options: .regularExpression)

    if let regex = try? NSRegularExpression(pattern: "<[^>]+>", options: []) {
      let fullRange = NSRange(location: 0, length: value.utf16.count)
      value = regex.stringByReplacingMatches(in: value, options: [], range: fullRange, withTemplate: "")
    }

    value = value
      .replacingOccurrences(of: "&nbsp;", with: " ")
      .replacingOccurrences(of: "&amp;", with: "&")
      .replacingOccurrences(of: "&lt;", with: "<")
      .replacingOccurrences(of: "&gt;", with: ">")

    return value.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private func sendRawData(_ data: Data, host: String, port: UInt16) throws {
    var hints = addrinfo(
      ai_flags: AI_ADDRCONFIG,
      ai_family: AF_UNSPEC,
      ai_socktype: SOCK_STREAM,
      ai_protocol: IPPROTO_TCP,
      ai_addrlen: 0,
      ai_canonname: nil,
      ai_addr: nil,
      ai_next: nil
    )

    var infoPointer: UnsafeMutablePointer<addrinfo>?
    let status = getaddrinfo(host, String(port), &hints, &infoPointer)
    guard status == 0, let firstInfo = infoPointer else {
      throw NSError(domain: "PrintModule", code: 2001, userInfo: [
        NSLocalizedDescriptionKey: "Failed to resolve printer host \(host): \(String(cString: gai_strerror(status)))",
      ])
    }
    defer { freeaddrinfo(firstInfo) }

    var currentInfo: UnsafeMutablePointer<addrinfo>? = firstInfo
    var lastErrorMessage = "Failed to connect to \(host):\(port)"

    while let info = currentInfo {
      let socketFD = Darwin.socket(info.pointee.ai_family, info.pointee.ai_socktype, info.pointee.ai_protocol)
      if socketFD >= 0 {
        let connectResult = Darwin.connect(socketFD, info.pointee.ai_addr, info.pointee.ai_addrlen)
        if connectResult == 0 {
          var sentTotal = 0
          let bytes = [UInt8](data)
          while sentTotal < bytes.count {
            let remaining = bytes.count - sentTotal
            let sent = bytes.withUnsafeBytes { rawBytes -> Int in
              guard let base = rawBytes.baseAddress else { return -1 }
              let pointer = base.advanced(by: sentTotal)
              return Darwin.send(socketFD, pointer, remaining, 0)
            }

            if sent <= 0 {
              lastErrorMessage = "Failed while sending print data: \(String(cString: strerror(errno)))"
              break
            }

            sentTotal += sent
          }

          Darwin.shutdown(socketFD, SHUT_WR)
          Darwin.close(socketFD)

          if sentTotal == bytes.count {
            return
          }
        } else {
          lastErrorMessage = "Failed to connect to \(host):\(port): \(String(cString: strerror(errno)))"
          Darwin.close(socketFD)
        }
      }

      currentInfo = info.pointee.ai_next
    }

    throw NSError(domain: "PrintModule", code: 2002, userInfo: [NSLocalizedDescriptionKey: lastErrorMessage])
  }

  private func stopServiceBrowsers() {
    serviceBrowsers.forEach { $0.stop() }
    serviceBrowsers.removeAll()
  }

  private func finishDiscovery() {
    stopServiceBrowsers()
    discoveryTimer?.invalidate()
    discoveryTimer = nil

    let result = discoveredPrinters.sorted {
      let left = ($0["name"] as? String) ?? ""
      let right = ($1["name"] as? String) ?? ""
      return left.localizedCaseInsensitiveCompare(right) == .orderedAscending
    }

    discoveryResolver?(result)
    discoveryResolver = nil
    discoveryRejecter = nil
    pendingServices.removeAll()
  }

  private func addDiscoveredPrinter(name: String, host: String, port: Int, serviceType: String) {
    let safeHost = host.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !safeHost.isEmpty else { return }

    let key = "\(safeHost):\(port):\(serviceType)"
    guard !discoveredPrinterKeys.contains(key) else { return }

    discoveredPrinterKeys.insert(key)
    discoveredPrinters.append([
      "name": name,
      "host": safeHost,
      "port": port,
      "serviceType": serviceType,
    ])
  }

  private func ipAddresses(from service: NetService) -> [String] {
    guard let addresses = service.addresses else { return [] }
    var result = Set<String>()

    for addressData in addresses {
      addressData.withUnsafeBytes { rawBuffer in
        guard let sockaddrPointer = rawBuffer.baseAddress?.assumingMemoryBound(to: sockaddr.self) else {
          return
        }

        let family = Int32(sockaddrPointer.pointee.sa_family)
        if family == AF_INET {
          var addr = rawBuffer.baseAddress!.assumingMemoryBound(to: sockaddr_in.self).pointee.sin_addr
          var buffer = [CChar](repeating: 0, count: Int(INET_ADDRSTRLEN))
          if inet_ntop(AF_INET, &addr, &buffer, socklen_t(INET_ADDRSTRLEN)) != nil {
            result.insert(String(cString: buffer))
          }
        } else if family == AF_INET6 {
          var addr = rawBuffer.baseAddress!.assumingMemoryBound(to: sockaddr_in6.self).pointee.sin6_addr
          var buffer = [CChar](repeating: 0, count: Int(INET6_ADDRSTRLEN))
          if inet_ntop(AF_INET6, &addr, &buffer, socklen_t(INET6_ADDRSTRLEN)) != nil {
            result.insert(String(cString: buffer))
          }
        }
      }
    }

    return Array(result)
  }

  // MARK: - NetServiceBrowserDelegate

  func netServiceBrowser(_ browser: NetServiceBrowser, didFind service: NetService, moreComing: Bool) {
    pendingServices.append(service)
    service.delegate = self
    service.resolve(withTimeout: 2.0)
  }

  func netServiceBrowser(_ browser: NetServiceBrowser, didNotSearch errorDict: [String: NSNumber]) {
    if serviceBrowsers.allSatisfy({ !$0.isEqual(browser) }) {
      finishDiscovery()
    }
  }

  // MARK: - NetServiceDelegate

  func netServiceDidResolveAddress(_ sender: NetService) {
    let hostCandidates = ipAddresses(from: sender)
    if hostCandidates.isEmpty, let hostName = sender.hostName {
      addDiscoveredPrinter(
        name: sender.name,
        host: hostName,
        port: sender.port,
        serviceType: sender.type
      )
    } else {
      hostCandidates.forEach { host in
        addDiscoveredPrinter(
          name: sender.name,
          host: host,
          port: sender.port,
          serviceType: sender.type
        )
      }
    }
  }

  func netService(_ sender: NetService, didNotResolve errorDict: [String: NSNumber]) {
    _ = errorDict
  }
}

final class ReceiptPreviewController: UIViewController, WKNavigationDelegate {
  private let html: String
  private let webView = WKWebView(frame: .zero)
  private let actionContainer = UIView()
  private let buttonStackView = UIStackView()
  private let printButton = UIButton(type: .system)
  private let cancelButton = UIButton(type: .system)
  private let activityIndicator = UIActivityIndicatorView(style: .large)

  init(html: String) {
    self.html = html
    super.init(nibName: nil, bundle: nil)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    configureLayout()
    webView.navigationDelegate = self
    webView.loadHTMLString(html, baseURL: nil)
  }

  private func configureLayout() {
    view.backgroundColor = .white

    webView.translatesAutoresizingMaskIntoConstraints = false
    webView.backgroundColor = .white
    webView.scrollView.contentInsetAdjustmentBehavior = .never

    actionContainer.translatesAutoresizingMaskIntoConstraints = false
    actionContainer.backgroundColor = .white
    actionContainer.layer.shadowColor = UIColor.black.cgColor
    actionContainer.layer.shadowOpacity = 0.08
    actionContainer.layer.shadowRadius = 10
    actionContainer.layer.shadowOffset = CGSize(width: 0, height: -2)

    printButton.setTitle("Print", for: .normal)
    printButton.setTitleColor(.white, for: .normal)
    printButton.titleLabel?.font = UIFont.systemFont(ofSize: 18, weight: .semibold)
    printButton.backgroundColor = UIColor(red: 1.0, green: 0.22, blue: 0.52, alpha: 1.0)
    printButton.layer.cornerRadius = 12
    printButton.contentEdgeInsets = UIEdgeInsets(top: 16, left: 24, bottom: 16, right: 24)
    printButton.addTarget(self, action: #selector(handlePrint), for: .touchUpInside)

    cancelButton.setTitle("Cancel", for: .normal)
    cancelButton.setTitleColor(UIColor(red: 0.11, green: 0.20, blue: 0.34, alpha: 1.0), for: .normal)
    cancelButton.titleLabel?.font = UIFont.systemFont(ofSize: 18, weight: .semibold)
    cancelButton.backgroundColor = UIColor(red: 0.93, green: 0.95, blue: 0.98, alpha: 1.0)
    cancelButton.layer.cornerRadius = 12
    cancelButton.contentEdgeInsets = UIEdgeInsets(top: 16, left: 24, bottom: 16, right: 24)
    cancelButton.addTarget(self, action: #selector(handleClose), for: .touchUpInside)

    buttonStackView.translatesAutoresizingMaskIntoConstraints = false
    buttonStackView.axis = .horizontal
    buttonStackView.spacing = 14
    buttonStackView.distribution = .fillEqually

    activityIndicator.translatesAutoresizingMaskIntoConstraints = false
    activityIndicator.hidesWhenStopped = true

    view.addSubview(webView)
    view.addSubview(actionContainer)
    view.addSubview(activityIndicator)
    actionContainer.addSubview(buttonStackView)
    buttonStackView.addArrangedSubview(cancelButton)
    buttonStackView.addArrangedSubview(printButton)

    let safeArea = view.safeAreaLayoutGuide
    NSLayoutConstraint.activate([
      webView.topAnchor.constraint(equalTo: safeArea.topAnchor),
      webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      webView.bottomAnchor.constraint(equalTo: actionContainer.topAnchor),

      actionContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      actionContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      actionContainer.bottomAnchor.constraint(equalTo: safeArea.bottomAnchor),

      buttonStackView.topAnchor.constraint(equalTo: actionContainer.topAnchor, constant: 10),
      buttonStackView.leadingAnchor.constraint(equalTo: actionContainer.leadingAnchor, constant: 20),
      buttonStackView.trailingAnchor.constraint(equalTo: actionContainer.trailingAnchor, constant: -20),
      buttonStackView.bottomAnchor.constraint(equalTo: actionContainer.bottomAnchor, constant: -10),
      buttonStackView.heightAnchor.constraint(greaterThanOrEqualToConstant: 56),

      activityIndicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      activityIndicator.centerYAnchor.constraint(equalTo: view.centerYAnchor),
    ])

    activityIndicator.startAnimating()
    cancelButton.isEnabled = true
    printButton.isEnabled = false
    printButton.alpha = 0.6
  }

  @objc
  private func handleClose() {
    dismiss(animated: true)
  }

  @objc
  private func handlePrint() {
    let printController = UIPrintInteractionController.shared
    let printInfo = UIPrintInfo(dictionary: nil)
    printInfo.outputType = .general
    printInfo.jobName = "eMenu Receipt"
    printController.printInfo = printInfo

    let formatter = UIMarkupTextPrintFormatter(markupText: html)
    formatter.perPageContentInsets = UIEdgeInsets(top: 20, left: 20, bottom: 20, right: 20)
    printController.printFormatter = formatter

    printController.present(animated: true, completionHandler: nil)
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    activityIndicator.stopAnimating()
    printButton.isEnabled = true
    printButton.alpha = 1
  }

  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    activityIndicator.stopAnimating()
    let alert = UIAlertController(title: "Preview Error", message: error.localizedDescription, preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: "OK", style: .default))
    present(alert, animated: true)
  }
}
#endif