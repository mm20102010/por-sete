import Foundation
import Combine
import SwiftUI

@MainActor final class WatchSettings: ObservableObject {
    @AppStorage("porSete.watch.answerMode") private var modeRaw = WatchAnswerMode.truncate.rawValue
    @AppStorage("porSete.watch.minimumDecimals") private var minimumStored = 5
    @AppStorage("porSete.watch.difficulty") private var difficultyRaw = WatchDifficulty.beginner.rawValue
    @AppStorage("porSete.watch.language") private var languageRaw = WatchLanguage.ptBR.rawValue

    var answerMode: WatchAnswerMode { get { WatchAnswerMode(rawValue: modeRaw) ?? .truncate } set { modeRaw = newValue.rawValue; objectWillChange.send() } }
    var minimumDecimals: Int { get { min(10,max(0,minimumStored)) } set { minimumStored=min(10,max(0,newValue)); objectWillChange.send() } }
    var difficulty: WatchDifficulty { get { WatchDifficulty(rawValue:difficultyRaw) ?? .beginner } set { difficultyRaw=newValue.rawValue; objectWillChange.send() } }
    var language: WatchLanguage { get { WatchLanguage(rawValue:languageRaw) ?? .ptBR } set { languageRaw=newValue.rawValue; objectWillChange.send() } }

    func text(_ key:String)->String { L10n.value(key, language: language) }
    func modeName(_ mode:WatchAnswerMode)->String { text(mode == .truncate ? "truncate" : "round") }
    func difficultyName(_ value:WatchDifficulty)->String { text(value.rawValue) }
}

enum L10n {
    static let table:[String:[WatchLanguage:String]] = [
        "start":[.ptBR:"Começar jogo",.en:"Start game",.es:"Comenzar juego"],
        "settings":[.ptBR:"Configurações",.en:"Settings",.es:"Configuración"],
        "criterion":[.ptBR:"Critério",.en:"Criterion",.es:"Criterio"],
        "truncate":[.ptBR:"Truncar",.en:"Truncate",.es:"Truncar"],
        "round":[.ptBR:"Arredondar",.en:"Round",.es:"Redondear"],
        "minimum":[.ptBR:"Mín. casas",.en:"Min. places",.es:"Mín. dec."],
        "free":[.ptBR:"Livre",.en:"Free",.es:"Libre"],
        "difficulty":[.ptBR:"Dificuldade",.en:"Difficulty",.es:"Dificultad"],
        "beginner":[.ptBR:"Iniciante",.en:"Beginner",.es:"Principiante"],
        "intermediate":[.ptBR:"Intermediário",.en:"Intermediate",.es:"Intermedio"],
        "advanced":[.ptBR:"Avançado",.en:"Advanced",.es:"Avanzado"],
        "language":[.ptBR:"Idioma",.en:"Language",.es:"Idioma"],
        "phase":[.ptBR:"Fase",.en:"Phase",.es:"Fase"],
        "correct":[.ptBR:"Acertos",.en:"Correct",.es:"Aciertos"],
        "errors":[.ptBR:"Erros",.en:"Errors",.es:"Errores"],
        "submit":[.ptBR:"Enviar",.en:"Submit",.es:"Enviar"],
        "continue":[.ptBR:"Continuar",.en:"Continue",.es:"Continuar"],
        "incorrect":[.ptBR:"Incorreto",.en:"Incorrect",.es:"Incorrecto"],
        "timeout":[.ptBR:"Tempo esgotado",.en:"Time's up",.es:"Tiempo agotado"],
        "correctAnswer":[.ptBR:"Correto",.en:"Correct",.es:"Correcto"],
        "victory":[.ptBR:"Vitória!",.en:"Victory!",.es:"¡Victoria!"],
        "gameOver":[.ptBR:"Game Over",.en:"Game Over",.es:"Game Over"],
        "again":[.ptBR:"Jogar novamente",.en:"Play again",.es:"Jugar de nuevo"],
        "menu":[.ptBR:"Menu",.en:"Menu",.es:"Menú"],
        "resume":[.ptBR:"Continuar jogo",.en:"Resume game",.es:"Continuar juego"],
        "paused":[.ptBR:"Jogo pausado",.en:"Game paused",.es:"Juego pausado"],
        "decimalSeparator":[.ptBR:"Separador decimal",.en:"Decimal separator",.es:"Separador decimal"],
        "delete":[.ptBR:"Apagar",.en:"Delete",.es:"Borrar"]
    ]
    static func value(_ key:String, language:WatchLanguage)->String { table[key]?[language] ?? key }
}
