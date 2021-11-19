import React from "react";
import styles from "../styles/Home.module.css";
import {
  getGoogleAccessToken,
} from "../utils";
import { useGoogleDriveResumableUpload } from "../hooks/useGoogleDriveResumableUpload";

export default function Home() {
  const {
    setFile,
    isUploading,
    handleUpload,
    uploadedFileLink,
    uploadProgress,
    fileSize,
  } = useGoogleDriveResumableUpload();

  return (
    <div className={styles.container}>
      <form onSubmit={(e) => e.preventDefault()}>
        <input
          type="file"
          name="file"
          accept="video/*"
          onChange={(e) => {
            setFile(e.target.files[0]);
          }}
        />
        <button
          onClick={() => {
            getGoogleAccessToken().then((token) => {
              if (token) handleUpload(token);
            });
          }}
        >
          {isUploading ? "Uploading..." : "Submit"}
        </button>
      </form>
      <progress
        id="file"
        value={uploadProgress.current}
        min={0}
        max={uploadProgress.end}
      />
      <br />
      {fileSize}
      <br />
      {uploadedFileLink?.webViewLink && (
        <a href={uploadedFileLink.webViewLink} target="_blank" rel="noreferrer">
          {uploadedFileLink.webViewLink}
        </a>
      )}
    </div>
  );
}
