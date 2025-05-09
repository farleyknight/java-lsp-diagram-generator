#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Define the download URL and target directory
# IMPORTANT: This URL points to a specific milestone version.
# You may want to update this URL to the latest available milestone from:
# http://download.eclipse.org/jdtls/milestones/
# OR use a snapshot URL:
# http://download.eclipse.org/jdtls/snapshots/
# LSP_VERSION="1.37.0" # Updated version
# LSP_BUILD="202406270957" # Updated build timestamp for v1.37.0
# LSP_DOWNLOAD_URL="http://download.eclipse.org/jdtls/milestones/${LSP_VERSION}/jdt-language-server-${LSP_VERSION}-${LSP_BUILD}.tar.gz"

# Attempting to use the latest snapshot URL
LSP_DOWNLOAD_URL="http://download.eclipse.org/jdtls/snapshots/jdt-language-server-latest.tar.gz"

TARGET_DIR_BASE="bin"
TARGET_DIR="${TARGET_DIR_BASE}/eclipse.jdt.ls"
DOWNLOAD_FILE="jdt-language-server.tar.gz"

echo "Starting Java LSP Server (Eclipse JDT LS) installation..."
echo "Download URL: ${LSP_DOWNLOAD_URL}"
echo "Target directory: ${TARGET_DIR}"

# Create the base target directory if it doesn't exist
mkdir -p "${TARGET_DIR_BASE}"

# Remove the target directory if it already exists to ensure a clean install
if [ -d "${TARGET_DIR}" ]; then
    echo "Removing existing directory: ${TARGET_DIR}"
    rm -rf "${TARGET_DIR}"
fi

# Create the target directory
mkdir -p "${TARGET_DIR}"

# Download the LSP server
echo "Downloading Eclipse JDT LS from ${LSP_DOWNLOAD_URL}..."
# Adding --fail to curl to make it exit with an error if the download fails
if ! curl --fail -L "${LSP_DOWNLOAD_URL}" -o "${TARGET_DIR_BASE}/${DOWNLOAD_FILE}"; then
    echo "Error: Failed to download Eclipse JDT LS. Please check the URL and your internet connection."
    # Clean up potentially partially downloaded file
    if [ -f "${TARGET_DIR_BASE}/${DOWNLOAD_FILE}" ]; then
        rm "${TARGET_DIR_BASE}/${DOWNLOAD_FILE}"
    fi
    exit 1
fi


# Extract the archive
echo "Extracting ${TARGET_DIR_BASE}/${DOWNLOAD_FILE} to ${TARGET_DIR}..."
TEMP_EXTRACT_DIR="${TARGET_DIR_BASE}/jdtls_temp_extract"
mkdir -p "${TEMP_EXTRACT_DIR}"

# Check if tar can list contents to see if it's a valid archive before extracting
if ! tar -tzf "${TARGET_DIR_BASE}/${DOWNLOAD_FILE}" > /dev/null; then
    echo "Error: Downloaded file is not a valid tar.gz archive or is corrupted."
    rm "${TARGET_DIR_BASE}/${DOWNLOAD_FILE}"
    rm -rf "${TEMP_EXTRACT_DIR}"
    exit 1
fi

tar -xzf "${TARGET_DIR_BASE}/${DOWNLOAD_FILE}" -C "${TEMP_EXTRACT_DIR}"

# Move all extracted contents to the target directory
echo "Moving all extracted contents from ${TEMP_EXTRACT_DIR} to ${TARGET_DIR}"
# Ensure the target directory exists
mkdir -p "${TARGET_DIR}"

# Copy all contents (including hidden files) from TEMP_EXTRACT_DIR to TARGET_DIR
cp -R "${TEMP_EXTRACT_DIR}/." "${TARGET_DIR}/"

# Clean up the downloaded archive and temporary extraction directory
echo "Cleaning up..."
rm "${TARGET_DIR_BASE}/${DOWNLOAD_FILE}"
rm -rf "${TEMP_EXTRACT_DIR}"

echo ""
echo "Eclipse JDT LS installation completed successfully in ${TARGET_DIR}."
echo "Make sure this script is executable: chmod +x scripts/install-lsp.sh"
echo "Then run: npm run lsp:install"
echo ""
echo "IMPORTANT: Eclipse JDT LS requires Java 21+ to run. Ensure it's installed and in your PATH." 