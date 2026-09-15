import Foundation

enum WatchLanguage: String, CaseIterable, Identifiable {
    case ptBR = "pt-BR"
    case en = "en"
    case es = "es"

    var id: String { rawValue }

    var nativeName: String {
        switch self {
        case .ptBR: return "Português"
        case .en: return "English"
        case .es: return "Español"
        }
    }
}

enum WatchAnswerMode: String, CaseIterable, Identifiable {
    case truncate
    case round
    var id: String { rawValue }
}

enum WatchDifficulty: String, CaseIterable, Identifiable {
    case beginner
    case intermediate
    case advanced
    var id: String { rawValue }
}
