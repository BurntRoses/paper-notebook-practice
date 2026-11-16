import Foundation
import AppKit
import Vision

struct OCRLine: Codable { let text:String; let confidence:Float; let bounds:[Double] }
struct OCRResult: Codable { let engine:String; let lines:[OCRLine]; let rawText:String; let uncertain:[String] }
do {
 guard CommandLine.arguments.count>1 else {throw NSError(domain:"PracticeOCR",code:1,userInfo:[NSLocalizedDescriptionKey:"Image file required"])}
 let url=URL(fileURLWithPath:CommandLine.arguments[1])
 guard let image=NSImage(contentsOf:url),let cg=image.cgImage(forProposedRect:nil,context:nil,hints:nil) else {throw NSError(domain:"PracticeOCR",code:2,userInfo:[NSLocalizedDescriptionKey:"Cannot read image"])}
 let request=VNRecognizeTextRequest()
 request.recognitionLevel = .accurate
 request.recognitionLanguages=["zh-Hans","en-US"]
 request.usesLanguageCorrection=false
 try VNImageRequestHandler(cgImage:cg,options:[:]).perform([request])
 let lines=(request.results ?? []).compactMap { observation -> OCRLine? in
  guard let candidate=observation.topCandidates(1).first else{return nil}
  let rect=observation.boundingBox
  // One coordinate convention for PDF, images and OCR: normalized top-left.
  return OCRLine(text:candidate.string,confidence:candidate.confidence,bounds:[rect.origin.x,1-rect.origin.y-rect.height,rect.width,rect.height])
 }.sorted { a,b in abs(a.bounds[1]-b.bounds[1])>0.012 ? a.bounds[1]<b.bounds[1] : a.bounds[0]<b.bounds[0] }
 let result=OCRResult(engine:"Apple Vision accurate OCR",lines:lines,rawText:lines.map{$0.text}.joined(separator:"\n"),uncertain:lines.filter{$0.confidence<0.85}.map{$0.text})
 let encoder=JSONEncoder();encoder.outputFormatting=[.prettyPrinted,.sortedKeys]
 FileHandle.standardOutput.write(try encoder.encode(result))
} catch {fputs("\(error.localizedDescription)\n",stderr);exit(1)}
