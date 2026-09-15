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
    var accent = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 18, weight: .bold, design: .rounded))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 33)
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

            HStack {
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
            }
            .padding(.horizontal, 4)
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
            let gap: CGFloat = 4
            let width = geometry.size.width
            let unit = (width - gap * 3) / 4

            VStack(spacing: 4) {
                HStack(spacing: 5) {
                    Text("\(settings.text("phase")) \(game.phase)")
                    Spacer(minLength: 2)
                    Text("✓\(game.correctInPhase)/10  ✕\(game.errors)/3")
                    if let left = game.timeLeft() {
                        Text(String(format: "%.1f", left))
                            .monospacedDigit()
                    }
                }
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .foregroundStyle(PorSetePalette.secondaryText)

                VStack(spacing: -2) {
                    Text("\(game.number)")
                        .font(.system(size: 30, weight: .black, design: .rounded))
                    Text("÷ 7")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(PorSetePalette.secondaryText)
                }

                let displayed = game.displayedInput(language: settings.language)
                Text(displayed.isEmpty ? "—" : displayed)
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .lineLimit(1)
                    .minimumScaleFactor(0.55)
                    .frame(maxWidth: .infinity, minHeight: 27)
                    .background(.black.opacity(0.18))
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                ForEach([["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]], id: \.self) { row in
                    HStack(spacing: gap) {
                        ForEach(row, id: \.self) { value in
                            Button(value) {
                                game.appendDigit(value)
                            }
                            .buttonStyle(KeyButton())
                        }
                    }
                }

                HStack(spacing: gap) {
                    Button(game.decimalKey(language: settings.language)) {
                        game.appendDigit("decimal")
                    }
                    .buttonStyle(KeyButton())
                    .frame(width: unit * 0.72)
                    .accessibilityLabel(settings.text("decimalSeparator"))

                    Button("0") {
                        game.appendDigit("0")
                    }
                    .buttonStyle(KeyButton())
                    .frame(width: unit)

                    Button {
                        game.backspace()
                    } label: {
                        Image(systemName: "delete.left")
                    }
                    .buttonStyle(KeyButton())
                    .frame(width: unit * 0.72)
                    .accessibilityLabel(settings.text("delete"))

                    Button {
                        submitAnswer()
                    } label: {
                        Image(systemName: "return")
                            .font(.system(size: 18, weight: .black))
                    }
                    .buttonStyle(KeyButton(accent: true))
                    .frame(maxWidth: .infinity)
                    .accessibilityLabel(settings.text("submit"))
                }
            }
            .padding(.horizontal, 2)
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
