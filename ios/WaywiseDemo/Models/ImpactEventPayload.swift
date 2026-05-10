import Foundation

struct LocationSnapshot: Equatable {
    let latitude: Double
    let longitude: Double
    let speedMetersPerSecond: Double
    let headingDegrees: Double?
    let horizontalAccuracyMeters: Double?
}

struct MotionSample: Equatable {
    let timestamp: Date
    let x: Double
    let y: Double
    let z: Double

    var magnitude: Double {
        sqrt((x * x) + (y * y) + (z * z))
    }
}

struct SensorWindowSummary: Codable, Equatable {
    let sampleCount: Int
    let peakMagnitude: Double
    let averageMagnitude: Double
    let recentMagnitudes: [Double]
}

struct ImpactEventPayload: Codable, Equatable {
    let vehicleId: String
    let driveSessionId: String
    let latitude: Double
    let longitude: Double
    let speed: Double
    let heading: Double?
    let impactMagnitude: Double
    let verticalAcceleration: Double?
    let gpsAccuracyMeters: Double?
    let timestamp: String
    let sourceType: String
    let appVersion: String
    let sensorWindowSummary: SensorWindowSummary
}

struct ImpactUploadResult: Codable, Equatable {
    let accepted: Bool
    let eventId: String
    let candidateId: String?
    let rejectionReason: String?
}

extension JSONEncoder {
    static var waywise: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        return encoder
    }
}

extension JSONDecoder {
    static var waywise: JSONDecoder {
        JSONDecoder()
    }
}

extension ISO8601DateFormatter {
    static var waywise: ISO8601DateFormatter {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        return formatter
    }
}

