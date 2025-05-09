#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
# set -e # Temporarily disabling set -e to rely on explicit checks for now

# Define the download URL and target directory
# IMPORTANT: This URL points to a specific milestone version.
# You may want to update this URL to the latest available milestone from:
# http://download.eclipse.org/jdtls/milestones/
# OR use a snapshot URL:
# http://download.eclipse.org/jdtls/snapshots/
# LSP_VERSION="1.37.0" # Updated version
# LSP_BUILD="202406270957" # Updated build timestamp for v1.37.0
# LSP_DOWNLOAD_URL="http://download.eclipse.org/jdtls/milestones/${LSP_VERSION}/jdt-language-server-${LSP_VERSION}-${LSP_BUILD}.tar.gz"

LSP_DOWNLOAD_URL_DEFAULT="http://download.eclipse.org/jdtls/snapshots/jdt-language-server-latest.tar.gz"
# Use environment variable if set, otherwise use default
LSP_DOWNLOAD_URL="${LSP_DOWNLOAD_URL:-$LSP_DOWNLOAD_URL_DEFAULT}"

echo "DEBUG: Effective LSP_DOWNLOAD_URL = ${LSP_DOWNLOAD_URL}" # ADDED FOR DEBUGGING

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
DOWNLOAD_FILE_TMP="${TARGET_DIR_BASE}/${DOWNLOAD_FILE}.tmp"

# Remove temporary file if it exists from a previous failed attempt
if [ -f "${DOWNLOAD_FILE_TMP}" ]; then
    rm -f "${DOWNLOAD_FILE_TMP}"
fi

if ! curl --fail -L "${LSP_DOWNLOAD_URL}" -o "${DOWNLOAD_FILE_TMP}"; then
    echo "Error: Failed to download Eclipse JDT LS. Please check the URL and your internet connection." >&2
    if [ -f "${DOWNLOAD_FILE_TMP}" ]; then
        rm -f "${DOWNLOAD_FILE_TMP}"
    fi
    exit 1
fi

# Check if the temporary downloaded file exists and is not empty before renaming
if [ ! -s "${DOWNLOAD_FILE_TMP}" ]; then
    echo "Error: Downloaded temporary file ${DOWNLOAD_FILE_TMP} does not exist or is empty." >&2
    if [ -f "${DOWNLOAD_FILE_TMP}" ]; then
        rm -f "${DOWNLOAD_FILE_TMP}"
    fi
    exit 1
fi

# Rename temporary file to the final download file name
mv "${DOWNLOAD_FILE_TMP}" "${TARGET_DIR_BASE}/${DOWNLOAD_FILE}"
if [ $? -ne 0 ]; then
    echo "Error: Failed to rename temporary download file ${DOWNLOAD_FILE_TMP} to ${TARGET_DIR_BASE}/${DOWNLOAD_FILE}." >&2
    # Attempt to clean up temporary file if it still exists
    if [ -f "${DOWNLOAD_FILE_TMP}" ]; then
        rm -f "${DOWNLOAD_FILE_TMP}"
    fi
    exit 1
fi

# Extract the archive
echo "Extracting ${TARGET_DIR_BASE}/${DOWNLOAD_FILE} to ${TARGET_DIR}..."
TEMP_EXTRACT_DIR="${TARGET_DIR_BASE}/jdtls_temp_extract"
mkdir -p "${TEMP_EXTRACT_DIR}"

if ! tar -tzf "${TARGET_DIR_BASE}/${DOWNLOAD_FILE}" > /dev/null; then
    echo "Error: Downloaded file is not a valid tar.gz archive or is corrupted." >&2
    rm "${TARGET_DIR_BASE}/${DOWNLOAD_FILE}"
    rm -rf "${TEMP_EXTRACT_DIR}"
    exit 1
fi

# Explicitly check tar -xzf for extraction errors
if ! tar -xzf "${TARGET_DIR_BASE}/${DOWNLOAD_FILE}" -C "${TEMP_EXTRACT_DIR}"; then
    echo "Error: Failed to extract jdt-language-server.tar.gz." >&2
    rm "${TARGET_DIR_BASE}/${DOWNLOAD_FILE}" # Clean up archive
    rm -rf "${TEMP_EXTRACT_DIR}" # Clean up temp dir
    exit 1
fi

# Move all extracted contents to the target directory
echo "Moving all extracted contents from ${TEMP_EXTRACT_DIR} to ${TARGET_DIR}"
mkdir -p "${TARGET_DIR}"
# Ensure TEMP_EXTRACT_DIR is not empty and files exist before attempting to copy
if [ -z "$(ls -A ${TEMP_EXTRACT_DIR})" ]; then
    echo "Error: Temporary extraction directory ${TEMP_EXTRACT_DIR} is empty. Nothing to move." >&2
    rm "${TARGET_DIR_BASE}/${DOWNLOAD_FILE}" # Clean up archive
    rm -rf "${TEMP_EXTRACT_DIR}" # Clean up temp dir
    rm -rf "${TARGET_DIR}" # Clean up target dir as it might be incomplete
    exit 1
fi

cp -R "${TEMP_EXTRACT_DIR}/." "${TARGET_DIR}/"
if [ $? -ne 0 ]; then
    echo "Error: Failed to copy files from ${TEMP_EXTRACT_DIR} to ${TARGET_DIR}. Check permissions and paths." >&2
    rm "${TARGET_DIR_BASE}/${DOWNLOAD_FILE}"
    rm -rf "${TEMP_EXTRACT_DIR}"
    rm -rf "${TARGET_DIR}"
    exit 1
fi

echo "Cleaning up..."
rm "${TARGET_DIR_BASE}/${DOWNLOAD_FILE}"
rm -rf "${TEMP_EXTRACT_DIR}"
echo ""
echo "Eclipse JDT LS installation completed successfully in ${TARGET_DIR}."
echo "Make sure this script is executable: chmod +x scripts/install-lsp.sh"
echo "Then run: npm run lsp:install"
echo ""
echo "IMPORTANT: Eclipse JDT LS requires Java 21+ to run. Ensure it's installed and in your PATH." 
# Re-enable set -e if it was disabled, or manage script exit explicitly
# exit 0 # Explicitly exit 0 on success if set -e is disabled throughout 