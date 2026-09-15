import Foundation

enum WatchGameMath {
    static func significantPlaces(_ raw: String) -> Int {
        let normalized = raw.replacingOccurrences(of: ",", with: ".")
        guard let dot = normalized.firstIndex(of: ".") else { return 0 }

        var decimals = String(normalized[normalized.index(after: dot)...])
        while decimals.last == "0" {
            decimals.removeLast()
        }
        return decimals.count
    }

    static func isCorrect(number: Int, raw: String, mode: WatchAnswerMode, minimum: Int) -> Bool {
        let normalized = raw.replacingOccurrences(of: ",", with: ".")
        guard normalized.range(of: #"^\d+(?:\.\d+)?$"#, options: .regularExpression) != nil else {
            return false
        }

        let parts = normalized.split(separator: ".", omittingEmptySubsequences: false)
        let integer = String(Int(parts[0]) ?? 0)
        var decimals = parts.count > 1 ? String(parts[1]) : ""

        while decimals.last == "0" {
            decimals.removeLast()
        }

        let places = max(decimals.count, max(0, minimum))
        let paddedDecimals = decimals + String(repeating: "0", count: max(0, places - decimals.count))
        let canonical = places > 0 ? "\(integer).\(paddedDecimals)" : integer

        return canonical == expected(number: number, places: places, mode: mode)
    }

    static func expected(number: Int, places: Int, mode: WatchAnswerMode) -> String {
        let safePlaces = max(0, places)
        let extra = mode == .round ? 1 : 0
        var integer = number / 7
        var remainder = number % 7
        var digits: [Int] = []

        if safePlaces + extra > 0 {
            for _ in 0..<(safePlaces + extra) {
                remainder *= 10
                digits.append(remainder / 7)
                remainder %= 7
            }
        }

        var kept = Array(digits.prefix(safePlaces))

        if mode == .round {
            let roundingDigit = digits.count > safePlaces ? digits[safePlaces] : 0
            if roundingDigit >= 5 {
                if kept.isEmpty {
                    integer += 1
                } else {
                    var carry = 1
                    var index = kept.count - 1

                    while carry == 1 {
                        let value = kept[index] + carry
                        kept[index] = value % 10
                        carry = value >= 10 ? 1 : 0

                        if index == 0 { break }
                        index -= 1
                    }

                    if carry == 1 {
                        integer += 1
                        kept = Array(repeating: 0, count: kept.count)
                    }
                }
            }
        }

        guard safePlaces > 0 else { return String(integer) }
        return String(integer) + "." + kept.map(String.init).joined()
    }
}
