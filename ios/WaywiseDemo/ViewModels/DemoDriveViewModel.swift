import Combine
import CoreLocation
import Foundation

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

    @Published var apiBaseURLString: String {
        didSet {
            UserDefaults.standard.set(apiBaseURLString, forKey: Self.apiBaseURLKey)
        }
    }
    @Published private(set) var vehicleId: String
    @Published private(set) var driveSessionId = "session-\(UUID().uuidString)"
    @Published private(set) var uploadState: UploadState = .idle

    let locationProvider: LocationProvider
    let motionSampler: MotionSampler

    private let builder: ImpactEventBuilder
    private let transport: HTTPTransport
    private static let apiBaseURLKey = "waywise.apiBaseURL"
    private static let vehicleIdKey = "waywise.vehicleId"

    init(
        locationProvider: LocationProvider = LocationProvider(),
        motionSampler: MotionSampler = MotionSampler(),
        transport: HTTPTransport = URLSessionHTTPTransport()
    ) {
        self.locationProvider = locationProvider
        self.motionSampler = motionSampler
        self.transport = transport
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
