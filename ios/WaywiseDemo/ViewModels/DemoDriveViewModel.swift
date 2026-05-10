import Combine
import CoreLocation
import Foundation
import UserNotifications

@MainActor
final class DemoDriveViewModel: ObservableObject {
    enum UploadState: Equatable {
        case idle
        case sending
        case sent(ImpactUploadResult)
        case failed(String)

        var label: String {
            switch self {
            case .idle:
                return "Ready"
            case .sending:
                return "Sending..."
            case .sent(let result):
                return result.accepted ? "Accepted by backend" : "Rejected: \(result.rejectionReason ?? "unknown")"
            case .failed(let message):
                return message
            }
        }
    }

    enum NotificationState: Equatable {
        case idle
        case scheduling
        case scheduled
        case failed(String)

        var label: String {
            switch self {
            case .idle:
                return "No alert scheduled"
            case .scheduling:
                return "Scheduling alert..."
            case .scheduled:
                return "Pothole alert scheduled for 30 seconds"
            case .failed(let message):
                return message
            }
        }
    }

    @Published var apiBaseURLString: String {
        didSet {
            UserDefaults.standard.set(apiBaseURLString, forKey: Self.apiBaseURLKey)
        }
    }
    @Published private(set) var vehicleId: String
    @Published private(set) var driveSessionId = "session-\(UUID().uuidString)"
    @Published private(set) var uploadState: UploadState = .idle
    @Published private(set) var notificationState: NotificationState = .idle

    let locationProvider: LocationProvider
    let motionSampler: MotionSampler

    private let builder: ImpactEventBuilder
    private let transport: HTTPTransport
    private let notificationScheduler: PotholeAlertNotificationScheduling
    private static let apiBaseURLKey = "waywise.apiBaseURL"
    private static let vehicleIdKey = "waywise.vehicleId"
    private static let potholeAlertDelay: TimeInterval = 30

    init(
        locationProvider: LocationProvider = LocationProvider(),
        motionSampler: MotionSampler = MotionSampler(),
        transport: HTTPTransport = URLSessionHTTPTransport(),
        notificationScheduler: PotholeAlertNotificationScheduling = UserNotificationPotholeAlertScheduler()
    ) {
        self.locationProvider = locationProvider
        self.motionSampler = motionSampler
        self.transport = transport
        self.notificationScheduler = notificationScheduler
        apiBaseURLString = UserDefaults.standard.string(forKey: Self.apiBaseURLKey) ?? ""
        if let storedVehicleId = UserDefaults.standard.string(forKey: Self.vehicleIdKey) {
            vehicleId = storedVehicleId
        } else {
            let nextVehicleId = "ios-demo-\(UUID().uuidString.prefix(8))"
            vehicleId = nextVehicleId
            UserDefaults.standard.set(nextVehicleId, forKey: Self.vehicleIdKey)
        }
        builder = ImpactEventBuilder(appVersion: Bundle.main.appVersionString)
    }

    func requestPermissionsAndStart() {
        locationProvider.requestPermissions()
        locationProvider.start()
        motionSampler.start()
    }

    func stopDrive() {
        locationProvider.stop()
        motionSampler.stop()
    }

    func sendDemoImpact() async {
        guard let baseURL = URL(string: apiBaseURLString.trimmingCharacters(in: .whitespacesAndNewlines)),
              !apiBaseURLString.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            uploadState = .failed(WaywiseAPIError.invalidBaseURL.localizedDescription)
            return
        }

        motionSampler.appendManualSpike()
        uploadState = .sending

        let payload = builder.makePayload(
            vehicleId: vehicleId,
            driveSessionId: driveSessionId,
            location: locationProvider.snapshot,
            samples: motionSampler.recentWindow(),
            timestamp: Date()
        )
        let client = WaywiseAPIClient(baseURL: baseURL, transport: transport)

        do {
            uploadState = .sent(try await client.uploadImpactEvent(payload))
        } catch {
            uploadState = .failed(error.localizedDescription)
        }
    }

    func schedulePotholeAlert() async {
        notificationState = .scheduling

        do {
            try await notificationScheduler.schedulePotholeDetectedAlert(after: Self.potholeAlertDelay)
            notificationState = .scheduled
        } catch {
            notificationState = .failed(error.localizedDescription)
        }
    }
}

@MainActor
protocol PotholeAlertNotificationScheduling {
    func schedulePotholeDetectedAlert(after delay: TimeInterval) async throws
}

struct UserNotificationPotholeAlertScheduler: PotholeAlertNotificationScheduling {
    private let notificationCenter: UNUserNotificationCenter

    init(notificationCenter: UNUserNotificationCenter = .current()) {
        self.notificationCenter = notificationCenter
    }

    func schedulePotholeDetectedAlert(after delay: TimeInterval) async throws {
        let granted = try await notificationCenter.requestAuthorization(options: [.alert, .sound])

        guard granted else {
            throw PotholeAlertNotificationError.permissionDenied
        }

        try await notificationCenter.add(PotholeDetectedNotification.makeRequest(delay: delay))
    }
}

enum PotholeAlertNotificationError: LocalizedError {
    case permissionDenied

    var errorDescription: String? {
        switch self {
        case .permissionDenied:
            return "Notifications are disabled for Waywise."
        }
    }
}

enum PotholeDetectedNotification {
    static func makeRequest(delay: TimeInterval) -> UNNotificationRequest {
        let content = UNMutableNotificationContent()
        content.title = "Pothole detected"
        content.body = "Waywise detected a likely pothole near your current route."
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(delay, 1), repeats: false)

        return UNNotificationRequest(
            identifier: "waywise.pothole-detected.\(UUID().uuidString)",
            content: content,
            trigger: trigger
        )
    }
}

private extension Bundle {
    var appVersionString: String {
        let version = object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
        let build = object(forInfoDictionaryKey: "CFBundleVersion") as? String

        return [version, build]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
            .joined(separator: "+")
            .nilIfEmpty ?? "ios-demo"
    }
}

private extension String {
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}
