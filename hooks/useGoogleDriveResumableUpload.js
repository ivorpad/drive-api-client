import { useState, useEffect } from "react";
import {
  uploadFile,
  formatBytes,
  setPermissions,
  getWebLink,
} from "../utils";
export const useGoogleDriveResumableUpload = () => {
  const [file, setFile] = useState(null);
  const [fileSize, setFileSize] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    end: 0,
  });
  const [uploadedFileLink, setUploadedFileLink] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const handleUpload = async (token) => {
    setIsUploading(true);
    const sessionUrl = await getSessionUrl(token);
  
    uploadFile(file, sessionUrl, async (res) => {
      setUploadProgress({
        current: res?.progressNumber?.current,
        end: res?.progressNumber?.end,
      });

      if (res?.status === "Done") {
        setUploadProgress({
          current: res?.progressNumber?.end,
          end: res?.progressNumber?.end,
        });

        const permissions = {
          role: "reader",
          type: "anyone",
        }

        await setPermissions(res.result.id, permissions)(token);
        getWebLink(res.result.id)(token).then(link => {
          setIsUploading(false);
          setUploadedFileLink(link);
        });
      }
    });
  };

  const getSessionUrl = async (token) => {
    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: file?.name,
          mimeType: file?.type,
        }),
      }
    );

    return response.headers.get("Location");
  };

  useEffect(() => {
    if (file?.size) setFileSize(formatBytes(file?.size));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);
  
  return {
    setFile,
    handleUpload,
    isUploading,
    uploadedFileLink,
    uploadProgress,
    fileSize,
  };
};