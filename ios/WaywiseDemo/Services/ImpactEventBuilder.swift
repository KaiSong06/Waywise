import Foundation

struct ImpactEventBuilder {
    let appVersion: String

    func makePayload(
        vehicleId: String,
        driveSessionId: String,
        location: LocationSnapshot,
        samples: [MotionSample],
        timestamp: Date
    ) -> ImpactEventPayload {
        let window = summarize(samples)
        let peakSample = samples.max { first, second in
            first.magnitude < second.magnitude
        }

        return ImpactEventPayload(
            vehicleId: vehicleId,
            driveSessionId: driveSessionId,
            latitude: location.latitude,
            longitude: location.longitude,
            speed: max(location.speedMetersPerSecond, 0) * 3.6,
            heading: location.headingDegrees,
            impactMagnitude: window.peakMagnitude,
            verticalAcceleration: peakSample?.z,
            gpsAccuracyMeters: location.horizontalAccuracyMeters,
            timestamp: ISO8601DateFormatter.waywise.string(from: timestamp),
            sourceType: "ios_demo",
            appVersion: appVersion,
            sensorWindowSummary: window
        )
    }

    private func summarize(_ samples: [MotionSample]) -> SensorWindowSummary {
        let magnitudes = samples.map(\.magnitude)
        let peak = magnitudes.max() ?? 1
        let average = magnitudes.isEmpty
            ? peak
            : magnitudes.reduce(0, +) / Double(magnitudes.count)

        return SensorWindowSummary(
            sampleCount: samples.count,
            peakMagnitude: peak,
            averageMagnitude: average,
            recentMagnitudes: Array(magnitudes.suffix(12))
        )
    }
}

