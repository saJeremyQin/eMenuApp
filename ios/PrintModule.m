#if __has_include(<React/RCTBridgeModule.h>)
#import <React/RCTBridgeModule.h>
#else
#import <Foundation/Foundation.h>

// Fallback definitions for editor/indexer environments where React headers
// are not visible. Real iOS builds use the React header path above.
#ifndef RCT_EXTERN_MODULE
#define RCT_EXTERN_MODULE(objc_name, objc_supername) objc_name : objc_supername
#endif

#ifndef RCT_EXTERN_METHOD
#define RCT_EXTERN_METHOD(method) - (void)method;
#endif

#ifndef RCTPromiseResolveBlock
typedef void (^RCTPromiseResolveBlock)(id _Nullable result);
#endif

#ifndef RCTPromiseRejectBlock
typedef void (^RCTPromiseRejectBlock)(NSString *code, NSString *message, NSError *error);
#endif
#endif

@interface RCT_EXTERN_MODULE(PrintModule, NSObject)

RCT_EXTERN_METHOD(printHTML:(NSString *)html
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(previewHTML:(NSString *)html
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(printToLANPrinter:(NSString *)html
                  printerIP:(NSString *)printerIP
                  printerPort:(nonnull NSNumber *)printerPort
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(discoverLANPrinters:(nonnull NSNumber *)timeoutMs
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end