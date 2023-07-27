/// <reference types="node" resolution-mode="require"/>
declare module "lib/unhandledrejection" {
    export = UnhandledRejection;
    class UnhandledRejection {
        init(): void;
        exitFunction: (() => void) | ((code?: number) => never);
        rejectionHandler(err: any): Promise<void>;
        getClient(): import("@sentry/types").Client<import("@sentry/types").ClientOptions<import("@sentry/types").BaseTransportOptions>>;
    }
}
declare module "lib/helpers" {
    export function getEnvironment(): string;
    export const tracingFilterRegex: RegExp[];
}
declare module "lib/sentry" {
    export function init(testingConfigOverwrites?: {}): void;
    import Sentry = require("@sentry/node");
    export { Sentry };
}
declare module "lib/metrics" {
    export = metrics;
    import metrics = require("prom-client");
}
declare module "lib/domain-fix" {
    export const strongReferences: Map<any, any>;
}
declare module "lib/monitoring" {
    export = MonitorServer;
    class MonitorServer {
        static convertListToPromises(checks: any): Promise<any[]>;
        constructor(tracing: any);
        config: {
            enabled: boolean;
            port: string | number;
            domainFixEnabled: boolean;
        };
        initialized: boolean;
        livenessChecks: any[];
        readinessChecks: any[];
        signalHooks: any[];
        observedServers: any[];
        terminus: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
        server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
        tracing: any;
        createServer(): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
        init(): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
        observeServer(server: any): void;
        /**
         * Add pre-controllers middlewares
         *
         * This function has to be called before adding the controllers
         * to the Express application
         *
         * @param {Object} app The Express application object
         */
        addPreControllersMiddlewares(app: any): void;
        domainFix: typeof import("lib/domain-fix");
        /**
         * Add post-controllers middlewares
         *
         * This function has to be called right after adding the controllers
         * to the Express application
         *
         * @param {Object} app The Express application object
         */
        addPostControllersMiddlewares(app: any): void;
        sentryTracingIdMiddleware(req: any, res: any, next: any): any;
        close(): void;
        addLivenessCheck(check: any): void;
        addReadinessCheck(check: any): void;
        addOnSignalHook(hook: any): void;
    }
    import http = require("http");
}
declare module "lib/tracing" {
    export = Tracing;
    class Tracing {
        constructor(config?: {});
        config: {
            enabled: boolean;
            debug: boolean;
            mongoTracingEnabled: boolean;
            captureMongoQueries: boolean;
            uri: string;
            tracingExpressEnabled: boolean;
        };
        start(): Promise<void>;
        sdk: opentelemetry.NodeSDK;
        tracer: opentelemetry.api.Tracer;
        isEnabled(): boolean;
        currentTraceId(): string;
        currentRootSpan(): opentelemetry.api.Span;
        currentSpan(): opentelemetry.api.Span;
        addAttribute(key: any, value: any): any;
        recordException(exception: any): any;
        addRootSpanAttribute(key: any, value: any): any;
    }
    import opentelemetry = require("@opentelemetry/sdk-node");
}
declare module "lib/feature-flags" {
    export class FeatureFlags {
        disabled: boolean;
        init(): void;
        unleash: unleash.Unleash;
        isEnabled(feature: any, context: any): boolean;
    }
    import unleash = require("unleash-client");
    export { unleash };
}
declare module "lib/observability" {
    export = Observability;
    class Observability {
        initialized: boolean;
        init(testingConfigOverwrites?: {}): this;
        tracing: Tracing;
        monitoring: MonitorServer;
        unhandledRejection: UnhandledRejection;
        Sentry: typeof import("@sentry/node");
        metrics: typeof import("prom-client");
        featureFlags: FeatureFlags;
    }
    import Tracing = require("lib/tracing");
    import MonitorServer = require("lib/monitoring");
    import UnhandledRejection = require("lib/unhandledrejection");
    import { FeatureFlags } from "lib/feature-flags";
}
declare module "@unu/observability" {
    export = instance;
    const instance: Observability;
    import Observability = require("lib/observability");
}
