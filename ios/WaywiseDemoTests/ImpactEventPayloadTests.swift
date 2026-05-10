import XCTest
@testable import WaywiseDemo

final class ImpactEventPayloadTests: XCTestCase {
    func testBuildsBackendCompatibleImpactEventPayload() throws {
        let timestamp = ISO8601DateFormatter.waywise.date(from: "2026-05-10T14:32:00Z")!
        let builder = ImpactEventBuilder(appVersion: "ios-demo-tests")
        let payload = builder.makePayload(
            vehicleId: "ios-demo-device",
            driveSessionId: "session-123",
            location: LocationSnapshot(
                latitude: 43.6531,
                longitude: -79.3832,
                speedMetersPerSecond: 10.56,
                headingDegrees: 270,
                horizontalAccuracyMeters: 8
            ),
            samples: [
                MotionSample(timestamp: timestamp.addingTimeInterval(-0.2), x: 0.1, y: 0.2, z: 1.0),
                MotionSample(timestamp: timestamp, x: 0.3, y: 0.4, z: 2.6)
            ],
            timestamp: timestamp
        )

        XCTAssertEqual(payload.vehicleId, "ios-demo-device")
        XCTAssertEqual(payload.driveSessionId, "session-123")
        XCTAssertEqual(payload.latitude, 43.6531, accuracy: 0.0001)
        XCTAssertEqual(payload.longitude, -79.3832, accuracy: 0.0001)
        XCTAssertEqual(payload.speed, 38, accuracy: 0.1)
        XCTAssertEqual(payload.heading, 270)
        XCTAssertEqual(payload.gpsAccuracyMeters, 8)
        XCTAssertEqual(payload.sourceType, "ios_demo")
        XCTAssertEqual(payload.appVersion, "ios-demo-tests")
        XCTAssertEqual(payload.timestamp, "2026-05-10T14:32:00Z")
        XCTAssertGreaterThan(payload.impactMagnitude, 1.0)
        XCTAssertEqual(try XCTUnwrap(payload.verticalAcceleration), 2.6, accuracy: 0.001)
        XCTAssertEqual(payload.sensorWindowSummary.sampleCount, 2)
        XCTAssertEqual(payload.sensorWindowSummary.peakMagnitude, payload.impactMagnitude, accuracy: 0.001)
    }

    func testEncodesOnlyBackendAcceptedKeys() throws {
        let timestamp = ISO8601DateFormatter.waywise.date(from: "2026-05-10T14:32:00Z")!
        let payload = ImpactEventBuilder(appVersion: "ios-demo-tests").makePayload(
            vehicleId: "vehicle",
            driveSessionId: "session",
            location: LocationSnapshot(
                latitude: 43,
                longitude: -79,
                speedMetersPerSecond: 0,
                headingDegrees: nil,
                horizontalAccuracyMeters: nil
            ),
            samples: [],
            timestamp: timestamp
        )

        let data = try JSONEncoder.waywise.encode(payload)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])

        XCTAssertEqual(
            Set(object.keys),
            [
                "vehicleId",
                "driveSessionId",
                "latitude",
                "longitude",
                "speed",
                "impactMagnitude",
                "timestamp",
                "sourceType",
                "appVersion",
                "sensorWindowSummary"
            ]
        )
        XCTAssertNil(object["heading"])
        XCTAssertNil(object["gpsAccuracyMeters"])
    }
}
