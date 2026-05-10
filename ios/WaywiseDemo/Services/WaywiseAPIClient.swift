import Foundation

struct HTTPTransportResponse: Sendable {
    let data: Data
    let statusCode: Int
}

protocol HTTPTransport: Sendable {
    func send(_ request: URLRequest) async throws -> HTTPTransportResponse
}

struct URLSessionHTTPTransport: HTTPTransport {
    let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func send(_ request: URLRequest) async throws -> HTTPTransportResponse {
        let (data, response) = try await session.data(for: request)
        let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0

        return HTTPTransportResponse(data: data, statusCode: statusCode)
    }
}

enum WaywiseAPIError: LocalizedError, Equatable, Sendable {
    case invalidBaseURL
    case invalidResponseStatus(Int)

    var errorDescription: String? {
        switch self {
        case .invalidBaseURL:
            return "Enter a valid Cloud Run API URL"
        case .invalidResponseStatus(let statusCode):
            return "Waywise API request failed with status \(statusCode)"
        }
    }
}

struct WaywiseAPIClient: Sendable {
    private let baseURL: URL
    private let transport: HTTPTransport

    init(baseURL: URL, transport: HTTPTransport = URLSessionHTTPTransport()) {
        self.baseURL = baseURL
        self.transport = transport
    }

    func uploadImpactEvent(_ payload: ImpactEventPayload) async throws -> ImpactUploadResult {
        var request = URLRequest(url: endpointURL(path: "impact-events"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder.waywise.encode(payload)

        let response = try await transport.send(request)

        guard (200..<300).contains(response.statusCode) else {
            throw WaywiseAPIError.invalidResponseStatus(response.statusCode)
        }

        return try JSONDecoder.waywise.decode(ImpactUploadResult.self, from: response.data)
    }

    private func endpointURL(path: String) -> URL {
        let normalized = baseURL.deletingTrailingSlash()

        if normalized.pathComponents.last == "api" {
            return normalized.appendingPathComponent(path)
        }

        return normalized
            .appendingPathComponent("api")
            .appendingPathComponent(path)
    }
}

private extension URL {
    func deletingTrailingSlash() -> URL {
        var text = absoluteString

        while text.hasSuffix("/") {
            text.removeLast()
        }

        return URL(string: text) ?? self
    }
}
