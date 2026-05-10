import CoreLocation
import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = DemoDriveViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    statusPanel
                    configurationPanel
                    sensorPanel
                    actionPanel
                }
                .padding()
            }
            .navigationTitle("Waywise Demo")
            .toolbar {
                Button("Start") {
                    viewModel.requestPermissionsAndStart()
                }
            }
        }
    }

    private var statusPanel: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("iOS proof app")
                .font(.headline)
            Text("Send one real app-originated impact event into the deployed Cloud Run backend for the recorded demo.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Label(viewModel.uploadState.label, systemImage: uploadIcon)
                .font(.callout.weight(.semibold))
        }
        .panelStyle()
    }

    private var configurationPanel: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Backend")
                .font(.headline)
            TextField("https://waywise-api-...run.app", text: $viewModel.apiBaseURLString)
                .textInputAutocapitalization(.never)
                .keyboardType(.URL)
                .autocorrectionDisabled()
                .textFieldStyle(.roundedBorder)
            Text("Vehicle \(viewModel.vehicleId)")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .panelStyle()
    }

    private var sensorPanel: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Sensors")
                .font(.headline)
            row("Location", locationText)
            row("Motion", viewModel.motionSampler.isRunning ? "Sampling accelerometer" : "Stopped")
            row("Latest impact magnitude", viewModel.motionSampler.latestMagnitude.formatted(.number.precision(.fractionLength(2))))
            if let error = viewModel.locationProvider.locationError ?? viewModel.motionSampler.motionError {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
        .panelStyle()
    }

    private var actionPanel: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button {
                Task {
                    await viewModel.sendDemoImpact()
                }
            } label: {
                Label("Send demo impact", systemImage: "paperplane.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)

            Button("Stop sampling") {
                viewModel.stopDrive()
            }
            .buttonStyle(.bordered)

            Divider()

            Button {
                Task {
                    await viewModel.schedulePotholeAlert()
                }
            } label: {
                Label("Schedule pothole alert", systemImage: "bell.badge.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .disabled(viewModel.notificationState == .scheduling)

            Text(viewModel.notificationState.label)
                .font(.caption)
                .foregroundStyle(notificationStatusColor)
        }
        .panelStyle()
    }

    private var notificationStatusColor: Color {
        switch viewModel.notificationState {
        case .failed:
            return .red
        case .scheduled:
            return .green
        default:
            return .secondary
        }
    }

    private var uploadIcon: String {
        switch viewModel.uploadState {
        case .idle:
            return "circle"
        case .sending:
            return "arrow.up.circle"
        case .sent:
            return "checkmark.circle.fill"
        case .failed:
            return "exclamationmark.triangle.fill"
        }
    }

    private var locationText: String {
        guard let location = viewModel.locationProvider.latestLocation else {
            return "Waiting for GPS; fallback coordinate will be used"
        }

        return "\(location.coordinate.latitude.formatted(.number.precision(.fractionLength(4)))), \(location.coordinate.longitude.formatted(.number.precision(.fractionLength(4))))"
    }

    private func row(_ title: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .multilineTextAlignment(.trailing)
        }
        .font(.callout)
    }
}

private extension View {
    func panelStyle() -> some View {
        padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    ContentView()
}
