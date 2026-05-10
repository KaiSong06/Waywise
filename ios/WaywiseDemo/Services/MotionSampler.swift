import CoreMotion
import Combine
import Foundation

@MainActor
final class MotionSampler: ObservableObject {
    @Published private(set) var samples: [MotionSample] = []
    @Published private(set) var latestMagnitude: Double = 0
    @Published private(set) var isRunning = false
    @Published private(set) var motionError: String?

    private let manager = CMMotionManager()
    private let queue = OperationQueue()
    private let maxSamples = 120

    init() {
        manager.accelerometerUpdateInterval = 1.0 / 30.0
        queue.name = "waywise.motion"
    }

    func start() {
        guard manager.isAccelerometerAvailable else {
            motionError = "Accelerometer is unavailable on this device"
            return
        }

        guard !manager.isAccelerometerActive else {
            return
        }

        isRunning = true
        motionError = nil
        manager.startAccelerometerUpdates(to: queue) { [weak self] data, error in
            guard let self else {
                return
            }

            Task { @MainActor in
                if let error {
                    self.motionError = error.localizedDescription
                    return
                }

                guard let acceleration = data?.acceleration else {
                    return
                }

                self.append(
                    MotionSample(
                        timestamp: Date(),
                        x: acceleration.x,
                        y: acceleration.y,
                        z: acceleration.z
                    )
                )
            }
        }
    }

    func stop() {
        manager.stopAccelerometerUpdates()
        isRunning = false
    }

    func recentWindow() -> [MotionSample] {
        Array(samples.suffix(30))
    }

    func appendManualSpike() {
        append(MotionSample(timestamp: Date(), x: 0.2, y: 0.3, z: 2.8))
    }

    private func append(_ sample: MotionSample) {
        samples.append(sample)
        if samples.count > maxSamples {
            samples.removeFirst(samples.count - maxSamples)
        }
        latestMagnitude = sample.magnitude
    }
}
