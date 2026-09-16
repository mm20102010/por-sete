import SwiftUI
import WatchKit
import Combine

private enum PorSetePalette {
    static let backgroundTop = Color(red: 0.027, green: 0.067, blue: 0.110)
    static let backgroundMiddle = Color(red: 0.051, green: 0.141, blue: 0.251)
    static let backgroundBottom = Color(red: 0.039, green: 0.090, blue: 0.153)
    static let buttonTop = Color(red: 0.149, green: 0.400, blue: 0.635)
    static let buttonBottom = Color(red: 0.094, green: 0.290, blue: 0.471)
    static let secondaryText = Color(red: 0.616, green: 0.800, blue: 1.000)
}

private struct PrimaryButton: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 42)
            .background(
                LinearGradient(
                    colors: [PorSetePalette.buttonTop, PorSetePalette.buttonBottom],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .opacity(configuration.isPressed ? 0.86 : 1)
    }
}

private struct KeyButton: ButtonStyle {
    var height: CGFloat = 33
    var fontSize: CGFloat = 18
    var accent = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: fontSize, weight: .bold, design: .rounded))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: height, maxHeight: height)
            .background(
                accent
                    ? Color.green.opacity(configuration.isPressed ? 0.65 : 0.85)
                    : Color.white.opacity(configuration.isPressed ? 0.15 : 0.075)
            )
            .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 9)
                    .stroke(.white.opacity(0.10))
            )
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
    }
}

struct ContentView: View {
    private enum Screen {
        case home
        case settings
    }

    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var settings = WatchSettings()
    @StateObject private var game = WatchGameEngine()
    @State private var shell: Screen = .home

    private let ticker = Timer.publish(every: 0.10, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    PorSetePalette.backgroundTop,
                    PorSetePalette.backgroundMiddle,
                    PorSetePalette.backgroundBottom
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            content
        }
        .onReceive(ticker) { now in
            game.tick(now: now)
        }
        .onChange(of: scenePhase) { _, phase in
            if phase != .active {
                game.pauseForBackground()
            }
        }
        .alert(settings.text("paused"), isPresented: $game.backgroundPaused) {
            Button(settings.text("resume")) {
                game.resumeFromBackground()
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        if game.screen == .playing {
            gameView
        } else if game.screen == .victory || game.screen == .gameOver {
            resultView
        } else {
            switch shell {
            case .home:
                homeView
            case .settings:
                settingsView
            }
        }
    }

    private var homeView: some View {
        VStack(spacing: 10) {
            Spacer(minLength: 4)

            Text("/7")
                .font(.system(size: 46, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .shadow(color: PorSetePalette.secondaryText.opacity(0.25), radius: 10)

            Text("Por Sete")
                .font(.headline)
                .foregroundStyle(PorSetePalette.secondaryText)

            Button(settings.text("start")) {
                startGame()
            }
            .buttonStyle(PrimaryButton())
            .padding(.horizontal, 8)

            Spacer()

            Button {
                shell = .settings
            } label: {
                Image(systemName: "gearshape")
                    .font(.system(size: 18, weight: .semibold))
                    .frame(width: 44, height: 44)
                    .background(.white.opacity(0.07))
                    .clipShape(Circle())
                    .accessibilityLabel(settings.text("settings"))
            }
            .buttonStyle(.plain)
            .frame(maxWidth: .infinity, alignment: .center)
        }
        .padding(.vertical, 4)
    }

    private var settingsView: some View {
        NavigationStack {
            Form {
                Section(settings.text("criterion")) {
                    Picker(
                        settings.text("criterion"),
                        selection: Binding(
                            get: { settings.answerMode },
                            set: { settings.answerMode = $0 }
                        )
                    ) {
                        ForEach(WatchAnswerMode.allCases) { mode in
                            Text(settings.modeName(mode)).tag(mode)
                        }
                    }
                }

                Section(settings.text("minimum")) {
                    Picker(
                        settings.text("minimum"),
                        selection: Binding(
                            get: { settings.minimumDecimals },
                            set: { settings.minimumDecimals = $0 }
                        )
                    ) {
                        Text(settings.text("free")).tag(0)
                        ForEach(1...10, id: \.self) { value in
                            Text("\(value)").tag(value)
                        }
                    }
                }

                Section(settings.text("difficulty")) {
                    Picker(
                        settings.text("difficulty"),
                        selection: Binding(
                            get: { settings.difficulty },
                            set: { settings.difficulty = $0 }
                        )
                    ) {
                        ForEach(WatchDifficulty.allCases) { difficulty in
                            Text(settings.difficultyName(difficulty)).tag(difficulty)
                        }
                    }
                }

                Section(settings.text("language")) {
                    Picker(
                        settings.text("language"),
                        selection: Binding(
                            get: { settings.language },
                            set: { settings.language = $0 }
                        )
                    ) {
                        ForEach(WatchLanguage.allCases) { language in
                            Text(language.nativeName).tag(language)
                        }
                    }
                }
            }
            .navigationTitle(settings.text("settings"))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button {
                        shell = .home
                    } label: {
                        Image(systemName: "chevron.left")
                    }
                }
            }
        }
    }

    private var gameView: some View {
        GeometryReader { geometry in
            let rowGap: CGFloat = 2
            let columnGap: CGFloat = 4
            let width = geometry.size.width
            let height = geometry.size.height
            let unit = (width - columnGap * 2) / 3
            let deviceWidth = WKInterfaceDevice.current().screenBounds.width

            // Size detection uses the physical Watch screen width, while the
            // vertical budget uses the actual GeometryReader height. This avoids
            // relying on a breakpoint that can vary with watchOS safe-area math.
            // On small Watches every row is derived from the available budget,
            // so hard minimums can never force the Enter key below the screen.
            let smallWatch = deviceWidth < 195
            let ultraWatch = deviceWidth >= 205
            let compactWatch = height < 205

            let headerHeight: CGFloat = smallWatch ? 28 : (compactWatch ? 30 : 34)
            let sideWidth: CGFloat = smallWatch ? 34 : (compactWatch ? 34 : 38)
            let numberFont: CGFloat = smallWatch ? 42 : (compactWatch ? 42 : (height < 235 ? 46 : 49))
            let divisionFont: CGFloat = smallWatch ? 11 : (compactWatch ? 11 : 13)
            let sideFont: CGFloat = smallWatch ? 8.5 : (compactWatch ? 8.5 : 9.5)
            let answerHeight: CGFloat = smallWatch ? 20 : (compactWatch ? 20 : 22)
            let answerFont: CGFloat = smallWatch ? 21 : (compactWatch ? 21 : 23)
            let totalGaps = rowGap * 6
            let bottomSafety: CGFloat = smallWatch ? 4 : 0
            let availableKeys = max(0, height - headerHeight - answerHeight - totalGaps - bottomSafety)

            let mainKeyHeight: CGFloat
            let enterKeyHeight: CGFloat
            if smallWatch {
                // Reserve about 17% of the keypad budget for Enter and divide
                // the remainder exactly among the four full-width keypad rows.
                // No lower clamp is applied to the four rows: total height can
                // therefore never exceed the actual Watch content height.
                enterKeyHeight = min(28, max(20, availableKeys * 0.17))
                mainKeyHeight = max(1, (availableKeys - enterKeyHeight) / 4)
            } else {
                let rawMainKeyHeight = (availableKeys - 28) / 4
                mainKeyHeight = max(27, min(35, rawMainKeyHeight))
                enterKeyHeight = max(24, min(ultraWatch ? 40 : 36, availableKeys - mainKeyHeight * 4))
            }

            let keyFont = max(16, min(20, mainKeyHeight * 0.56))
            let enterKeyFont = max(15, min(19, enterKeyHeight * 0.56))
            let headerLift: CGFloat = smallWatch ? -11 : -9
            let stackLift: CGFloat = smallWatch ? -8 : -6

            VStack(spacing: rowGap) {
                HStack(alignment: .top, spacing: 2) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text("\(settings.text("phase")) \(game.phase)")
                            .lineLimit(1)
                        if let left = game.timeLeft() {
                            Text(String(format: "%.1f s", left))
                                .monospacedDigit()
                                .lineLimit(1)
                        } else {
                            Text(" ")
                                .accessibilityHidden(true)
                        }
                    }
                    .font(.system(size: sideFont, weight: .semibold, design: .rounded))
                    .foregroundStyle(PorSetePalette.secondaryText)
                    .frame(width: sideWidth, height: headerHeight, alignment: .topLeading)
                    .offset(y: headerLift)

                    VStack(spacing: -7) {
                        Text("\(game.number)")
                            .font(.system(size: numberFont, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.70)
                        Text("÷ 7")
                            .font(.system(size: divisionFont, weight: .bold, design: .rounded))
                            .foregroundStyle(PorSetePalette.secondaryText)
                    }
                    .frame(maxWidth: .infinity, maxHeight: headerHeight, alignment: .top)
                    .offset(y: headerLift)

                    VStack(alignment: .trailing, spacing: 1) {
                        Text("✓\(game.correctInPhase)/10")
                        Text("✕\(game.errors)/3")
                    }
                    .font(.system(size: sideFont, weight: .semibold, design: .rounded))
                    .foregroundStyle(PorSetePalette.secondaryText)
                    .monospacedDigit()
                    .frame(width: sideWidth, height: headerHeight, alignment: .topTrailing)
                    .offset(y: headerLift)
                }
                .frame(height: headerHeight, alignment: .top)

                let displayed = game.displayedInput(language: settings.language)
                Text(displayed.isEmpty ? " " : displayed)
                    .font(.system(size: answerFont, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .lineLimit(1)
                    .minimumScaleFactor(0.55)
                    .frame(maxWidth: .infinity, minHeight: answerHeight, maxHeight: answerHeight)
                    .background(.black.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))

                ForEach([["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]], id: \.self) { row in
                    HStack(spacing: columnGap) {
                        ForEach(row, id: \.self) { value in
                            Button(value) {
                                game.appendDigit(value)
                            }
                            .buttonStyle(KeyButton(height: mainKeyHeight, fontSize: keyFont))
                        }
                    }
                    .frame(height: mainKeyHeight)
                }

                HStack(spacing: columnGap) {
                    Button(game.decimalKey(language: settings.language)) {
                        game.appendDigit("decimal")
                    }
                    .buttonStyle(KeyButton(height: mainKeyHeight, fontSize: keyFont))
                    .frame(width: unit)
                    .accessibilityLabel(settings.text("decimalSeparator"))

                    Button("0") {
                        game.appendDigit("0")
                    }
                    .buttonStyle(KeyButton(height: mainKeyHeight, fontSize: keyFont))
                    .frame(width: unit)

                    Button {
                        game.backspace()
                    } label: {
                        Image(systemName: "delete.left")
                    }
                    .buttonStyle(KeyButton(height: mainKeyHeight, fontSize: keyFont))
                    .frame(width: unit)
                    .accessibilityLabel(settings.text("delete"))
                }
                .frame(height: mainKeyHeight)

                HStack(spacing: columnGap) {
                    Spacer(minLength: 0)

                    Button {
                        submitAnswer()
                    } label: {
                        Image(systemName: "return")
                            .font(.system(size: max(16, enterKeyFont), weight: .black))
                    }
                    .buttonStyle(KeyButton(height: enterKeyHeight, fontSize: enterKeyFont, accent: true))
                    .frame(width: unit * 2.05)
                    .accessibilityLabel(settings.text("submit"))

                    Spacer(minLength: 0)
                }
                .frame(height: enterKeyHeight)
            }
            .padding(.horizontal, 2)
            .offset(y: stackLift)
            .frame(maxHeight: .infinity, alignment: .top)
        }
        .alert(item: $game.mistake) { mistake in
            Alert(
                title: Text(mistake.timeout ? settings.text("timeout") : settings.text("incorrect")),
                message: Text(
                    "\(mistake.number) ÷ 7\n\(settings.text("correctAnswer")): \(localized(mistake.correct))"
                ),
                dismissButton: .default(Text(settings.text("continue"))) {
                    game.continueAfterMistake()
                }
            )
        }
    }

    private var resultView: some View {
        VStack(spacing: 9) {
            Text(game.screen == .victory ? "🎉 \(settings.text("victory"))" : settings.text("gameOver"))
                .font(.title3.bold())

            Text(String(format: "%.2f s", game.finalElapsed))
                .font(.system(.title2, design: .rounded, weight: .bold))
                .monospacedDigit()

            Text("✓ \(game.totalCorrect)   ✕ \(game.errors)")
                .foregroundStyle(PorSetePalette.secondaryText)

            Button(settings.text("again")) {
                startGame()
            }
            .buttonStyle(PrimaryButton())

            Button(settings.text("menu")) {
                game.goHome()
                shell = .home
            }
            .buttonStyle(.bordered)
        }
        .padding(.horizontal, 8)
    }

    private func localized(_ value: String) -> String {
        settings.language == .en ? value : value.replacingOccurrences(of: ".", with: ",")
    }

    private func startGame() {
        shell = .home
        game.startGame(settings: settings)
    }

    private func submitAnswer() {
        game.submitAnswer()
    }
}
