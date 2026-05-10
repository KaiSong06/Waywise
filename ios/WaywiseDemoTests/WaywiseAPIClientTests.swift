import XCTest
import UserNotifications
@testable import WaywiseDemo

final class WaywiseAPIClientTests: XCTestCase {
    func testUploadsImpactEventToBackendEndpoint() async throws {
        let payload = ImpactEventPayload(
            vehicleId: "vehicle-1",
            driveSessionId: "session-1",
            latitude: 43.6531,
            longitude: -79.3832,
            speed: 38,
            heading: 270,
            impactMagnitude: 2.7,
            verticalAcceleration: 2.6,
            gpsAccuracyMeters: 8,
            timestamp: "2026-05-10T14:32:00Z",
            sourceType: "ios_demo",
            appVersion: "ios-demo-tests",
            sensorWindowSummary: SensorWindowSummary(
                sampleCount: 2,
                peakMagnitude: 2.7,
                averageMagnitude: 1.8,
                recentMagnitudes: [1.2, 2.7]
            )
        )
        let transport = RecordingTransport(
            response: HTTPTransportResponse(
                data: #"{"accepted":true,"eventId":"event-123","candidateId":"candidate-123"}"#.data(using: .utf8)!,
                statusCode: 202
            )
        )
        let client = WaywiseAPIClient(
            baseURL: URL(string: "https://waywise-api.example.com")!,
            transport: transport
        )

        let result = try await client.uploadImpactEvent(payload)

        let requests = await transport.recordedRequests
        let request = try XCTUnwrap(requests.first)
        XCTAssertEqual(request.url?.absoluteString, "https://waywise-api.example.com/api/impact-events")
        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")
        let body = try XCTUnwrap(request.httpBody)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: body) as? [String: Any])
        XCTAssertEqual(object["vehicleId"] as? String, "vehicle-1")
        XCTAssertEqual(result.accepted, true)
        XCTAssertEqual(result.eventId, "event-123")
        XCTAssertEqual(result.candidateId, "candidate-123")
    }

    func testThrowsHelpfulErrorForNonAcceptedResponse() async throws {
        let transport = RecordingTransport(
            response: HTTPTransportResponse(
                data: #"{"error":"bad_request"}"#.data(using: .utf8)!,
                statusCode: 400
            )
        )
        let client = WaywiseAPIClient(
            baseURL: URL(string: "https://waywise-api.example.com/api")!,
            transport: transport
        )

        do {
            _ = try await client.uploadImpactEvent(.minimalFixture)
            XCTFail("Expected upload to fail")
        } catch let error as WaywiseAPIError {
            XCTAssertEqual(error.errorDescription, "Waywise API request failed with status 400")
        }
    }
}

final class PotholeAlertNotificationTests: XCTestCase {
    func testBuildsThirtySecondPotholeDetectedNotificationRequest() throws {
        let request = PotholeDetectedNotification.makeRequest(delay: 30)

        XCTAssertTrue(request.identifier.hasPrefix("waywise.pothole-detected."))
        XCTAssertEqual(request.content.title, "Pothole detected")
        XCTAssertEqual(request.content.body, "Waywise detected a likely pothole near your current route.")
        XCTAssertNotNil(request.content.sound)
        let trigger = try XCTUnwrap(request.trigger as? UNTimeIntervalNotificationTrigger)
        XCTAssertEqual(trigger.timeInterval, 30, accuracy: 0.001)
        XCTAssertFalse(trigger.repeats)
    }
}

private actor RecordingTransport: HTTPTransport {
    private(set) var recordedRequests: [URLRequest] = []
    private let response: HTTPTransportResponse

    init(response: HTTPTransportResponse) {
        self.response = response
    }

    func send(_ request: URLRequest) async throws -> HTTPTransportResponse {
        recordedRequests.append(request)
        return response
    }
}

private extension ImpactEventPayload {
    static let minimalFixture = ImpactEventPayload(
        vehicleId: "vehicle",
        driveSessionId: "session",
        latitude: 43,
        longitude: -79,
        speed: 0,
        heading: nil,
        impactMagnitude: 1,
        verticalAcceleration: nil,
        gpsAccuracyMeters: nil,
        timestamp: "2026-05-10T14:32:00Z",
        sourceType: "ios_demo",
        appVersion: "ios-demo-tests",
        sensorWindowSummary: SensorWindowSummary(
            sampleCount: 0,
            peakMagnitude: 1,
            averageMagnitude: 1,
            recentMagnitudes: []
        )
    )
}
