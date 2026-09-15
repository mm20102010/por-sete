import Foundation
import Combine
import SwiftUI

struct WatchMistake: Identifiable, Equatable {
    let id = UUID()
    let timeout: Bool
    let number: Int
    let correct: String
    let entered: String
}

@MainActor
final class WatchGameEngine: ObservableObject {
    enum Screen {
        case home
        case playing
        case victory
        case gameOver
    }

    @Published var screen: Screen = .home
    @Published var phase = 1
    @Published var correctInPhase = 0
    @Published var totalCorrect = 0
    @Published var errors = 0
    @Published var number = 0
    @Published var input = ""
    @Published var mistake: WatchMistake?
    @Published var backgroundPaused = false
    @Published var finalElapsed: TimeInterval = 0

    private(set) var difficulty: WatchDifficulty = .beginner
    private(set) var mode: WatchAnswerMode = .truncate
    private(set) var minimumDecimals = 5

    private var activeStartedAt: Date?
    private var elapsedAccumulated: TimeInterval = 0
    private var questionDeadline: Date?
    private var questionRemaining: TimeInterval?

    func startGame(settings: WatchSettings) {
        difficulty = settings.difficulty
        mode = settings.answerMode
        minimumDecimals = settings.minimumDecimals
        screen = .playing
        phase = 1
        correctInPhase = 0
        totalCorrect = 0
        errors = 0
        input = ""
        mistake = nil
        backgroundPaused = false
        elapsedAccumulated = 0
        finalElapsed = 0
        activeStartedAt = Date()
        nextNumber()
        resetQuestionClock()
    }

    func goHome() {
        screen = .home
        mistake = nil
        backgroundPaused = false
        activeStartedAt = nil
        questionDeadline = nil
        questionRemaining = nil
    }

    func decimalKey(language: WatchLanguage) -> String {
        language == .en ? "." : ","
    }

    func appendDigit(_ value: String) {
        guard screen == .playing, mistake == nil, !backgroundPaused else { return }

        if value == "decimal" {
            guard !input.contains(".") else { return }
            input += input.isEmpty ? "0." : "."
        } else if value.count == 1, value.first?.isNumber == true {
            input += value
        }
    }

    func backspace() {
        guard screen == .playing, mistake == nil, !backgroundPaused, !input.isEmpty else { return }
        input.removeLast()
    }

    func displayedInput(language: WatchLanguage) -> String {
        language == .en ? input : input.replacingOccurrences(of: ".", with: ",")
    }

    func elapsed(now: Date = Date()) -> TimeInterval {
        guard screen == .playing else { return finalElapsed }
        return elapsedAccumulated + (activeStartedAt.map { max(0, now.timeIntervalSince($0)) } ?? 0)
    }

    func timeLeft(now: Date = Date()) -> TimeInterval? {
        if let deadline = questionDeadline {
            return max(0, deadline.timeIntervalSince(now))
        }
        return questionRemaining
    }

    func tick(now: Date = Date()) {
        guard
            screen == .playing,
            mistake == nil,
            !backgroundPaused,
            let deadline = questionDeadline,
            now >= deadline
        else { return }

        pause(at: deadline)
        mistake = WatchMistake(
            timeout: true,
            number: number,
            correct: WatchGameMath.expected(number: number, places: max(5, minimumDecimals), mode: mode),
            entered: ""
        )
    }

    func pauseForBackground() {
        guard screen == .playing, mistake == nil, !backgroundPaused else { return }
        pause(at: Date())
        backgroundPaused = true
    }

    func resumeFromBackground() {
        guard screen == .playing, backgroundPaused else { return }
        backgroundPaused = false
        activeStartedAt = Date()
        if let remaining = questionRemaining {
            questionDeadline = Date().addingTimeInterval(remaining)
        }
    }

    func submitAnswer() {
        guard screen == .playing, mistake == nil, !backgroundPaused, !input.isEmpty else { return }

        tick()
        guard mistake == nil else { return }

        if WatchGameMath.isCorrect(number: number, raw: input, mode: mode, minimum: minimumDecimals) {
            totalCorrect += 1
            correctInPhase += 1

            if correctInPhase >= 10 {
                if phase >= 5 {
                    finish(.victory)
                    return
                }
                phase += 1
                correctInPhase = 0
            }

            nextNumber()
            resetQuestionClock()
        } else {
            pause(at: Date())
            let places = max(WatchGameMath.significantPlaces(input), minimumDecimals)
            mistake = WatchMistake(
                timeout: false,
                number: number,
                correct: WatchGameMath.expected(number: number, places: places, mode: mode),
                entered: input
            )
        }
    }

    func continueAfterMistake() {
        guard mistake != nil else { return }
        mistake = nil
        errors += 1

        if errors >= 3 {
            finish(.gameOver)
            return
        }

        nextNumber()
        resumeAfterMistake()
    }

    private func pause(at date: Date) {
        if let start = activeStartedAt {
            elapsedAccumulated += max(0, date.timeIntervalSince(start))
        }
        activeStartedAt = nil

        if let deadline = questionDeadline {
            questionRemaining = max(0, deadline.timeIntervalSince(date))
            questionDeadline = nil
        }
    }

    private func resumeAfterMistake() {
        activeStartedAt = Date()
        resetQuestionClock()
    }

    private func finish(_ target: Screen) {
        finalElapsed = elapsed()
        elapsedAccumulated = finalElapsed
        activeStartedAt = nil
        questionDeadline = nil
        questionRemaining = nil
        screen = target
    }

    private func nextNumber() {
        let previous = number
        var next = Int.random(in: 0...999)
        if next == previous, previous != 0 {
            next = (next + 1) % 1000
        }
        number = next
        input = ""
    }

    private func phaseSeconds() -> TimeInterval? {
        switch difficulty {
        case .beginner:
            return nil
        case .intermediate:
            return TimeInterval([20, 18, 16, 14, 12][phase - 1])
        case .advanced:
            return TimeInterval([5, 4, 3, 2, 1][phase - 1])
        }
    }

    private func resetQuestionClock() {
        guard let seconds = phaseSeconds() else {
            questionRemaining = nil
            questionDeadline = nil
            return
        }

        questionRemaining = seconds
        questionDeadline = Date().addingTimeInterval(seconds)
    }

}
