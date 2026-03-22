import Foundation
import UIKit
import WebKit

@objc(PrintModule)
class PrintModule: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
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