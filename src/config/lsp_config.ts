export interface JavaLspConfig {
    serverCommand: string;
    serverJarPath: string; // Path to the equinox launcher JAR
    serverArgs: string[];
    workspaceDataPath?: string; // Absolute path for -data parameter, unique per project
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initializationOptions?: any;
    logLevel?: string; // e.g., ALL, INFO, ERROR
}

export const defaultLspConfig: JavaLspConfig = {
    serverCommand: "java",
    serverJarPath: "bin/eclipse.jdt.ls/plugins/org.eclipse.equinox.launcher_1.7.0.v20250404-1055.jar", // Updated path
    serverArgs: [
        "-Declipse.application=org.eclipse.jdt.ls.core.id1",
        "-Dosgi.bundles.defaultStartLevel=4",
        "-Declipse.product=org.eclipse.jdt.ls.core.product",
        // "-Dlog.level=ALL", // Example, can be overridden or set via logLevel property
        "-Xmx1G",
        "--add-modules=ALL-SYSTEM",
        "--add-opens", "java.base/java.util=ALL-UNNAMED",
        "--add-opens", "java.base/java.lang=ALL-UNNAMED",
        // The following will be appended by LspManager:
        // "-jar", "<path_to_launcher_jar>",
        // "-configuration", "<path_to_server_root>/config_OS",
        // "-data", "<absolute_path_to_project_workspace_data>"
    ],
    logLevel: "ALL", // Default log level
    // workspaceDataPath: will be set dynamically per project
    // initializationOptions: can be set if needed
}; 