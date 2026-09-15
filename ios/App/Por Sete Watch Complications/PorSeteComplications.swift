import WidgetKit
import SwiftUI

private struct Entry: TimelineEntry { let date: Date }
private struct Provider: TimelineProvider { func placeholder(in context:Context)->Entry{Entry(date:.now)};func getSnapshot(in context:Context,completion:@escaping(Entry)->Void){completion(Entry(date:.now))};func getTimeline(in context:Context,completion:@escaping(Timeline<Entry>)->Void){completion(Timeline(entries:[Entry(date:.now)],policy:.never))} }
private struct IconView: View { @Environment(\.widgetFamily) private var family; var body: some View { Group { if family == .accessoryInline { HStack(spacing:3){Text("/7").font(.system(.body,design:.rounded,weight:.black));Text("Por Sete")} } else { Image("PorSeteAppIcon").resizable().scaledToFit().clipShape(RoundedRectangle(cornerRadius:family == .accessoryCorner ? 7:12,style:.continuous)).padding(family == .accessoryCorner ? 2:4) } }.containerBackground(for:.widget){Color.clear}.accessibilityLabel(Text("Por Sete")) } }
private struct PorSeteIconComplication: Widget { let kind="PorSeteIconComplication"; var body: some WidgetConfiguration { StaticConfiguration(kind:kind,provider:Provider()){_ in IconView()}.configurationDisplayName(Text("complication.name")).description(Text("complication.description")).supportedFamilies([.accessoryCircular,.accessoryCorner,.accessoryInline]) } }
@main struct PorSeteComplicationsBundle: WidgetBundle { var body: some Widget { PorSeteIconComplication() } }
