#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PrintModule, NSObject)

RCT_EXTERN_METHOD(printHTML:(NSString *)html
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(previewHTML:(NSString *)html
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end