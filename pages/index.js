import React from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";

const attemptUpload = async (obj, url) => {
  return new Promise(function (resolve, reject) {
    fetch(url, {
      method: "PUT",
      body: obj.data,
      headers: {
        "Content-Range": obj.range,
        "Content-Length": obj.data.byteLength,
      },
    })
      .then((res) => {
        const status = res.status;
        if (status == 308) {
          resolve({ status: "Next", result: res });
        } else if (status == 200) {
          res.json().then((r) => resolve({ status: "Done", result: r }));
        } else {
          res.json().then((err) => {
            err.additionalInformation =
              "When the file size is large, there is the case that the file cannot be converted to Google Docs. Please be careful this.";
            reject(err);
            return;
          });
          return;
        }
      })
      .catch((err) => {
        console.log(err.message, err);
        // reject(err);
        return;
      });
  });
};

const getFile = ({ location, fileSize, len, start, end, data, i }) => {
  return new Promise(function (resolve, reject) {
    const fr = new FileReader();
    fr.onload = async function () {
      const buf = fr.result;
      const obj = {
        data: new Uint8Array(buf),
        length: end - start + 1,
        range: "bytes " + start + "-" + end + "/" + fileSize,
        startByte: start,
        endByte: end,
        total: fileSize,
        totalChunkNumber: len,
      };
      await attemptUpload(obj, location)
        .then((res) => resolve(res))
        .catch((err) => reject(err));
    };
    fr.readAsArrayBuffer(data);
  });
};

const uploadFile = async (file, url, token, location, callback) => {
  const chunkSize = 52428800; // 20MB (must be multiple of 256kb)
  const fileSize = file?.size;
  const len = Math.ceil(fileSize / chunkSize);
  for (let i = 0; i < len; i++) {
    let start = i * chunkSize;
    let end = fileSize < start + chunkSize ? fileSize : start + chunkSize;
    let data = file.slice(start, end);

    end -= 1;
    callback?.({ progressNumber: { current: i, end: len } }, location);

    try {
      const res = await getFile({
        location,
        fileSize,
        len,
        start,
        end,
        data,
        i,
      });
      if (res.status == "Next" || (res.status == "Done" && i == len - 1)) {
        callback(
          {
            ...res,
            progressNumber: { current: i, end: len },
          },
          null
        );
      } else {
        callback(null, "Internal error.");
        return;
      }
    } catch (err) {
      console.log(err);
      callback(null, err);
      return;
    }
  }
};

export default function Home() {
  // Modify by useReducer

  const [file, setFile] = React.useState();
  const [fileSize, setFileSize] = React.useState();
  const [url, setUrl] = React.useState();
  const [accessToken, setAccessToken] = React.useState();
  const [link, setLink] = React.useState();
  const [progress, setProgress] = React.useState({ current: 0, end: 100 });
  const [isUploading, setIsUploading] = React.useState(false);

  const handleSetResumableSessionUrl = async (e) => {
    e.preventDefault();

    setIsUploading(true);

    const { token } = await fetch(
      `http://localhost:9000/.netlify/functions/google-drive?eventType=token`
    ).then((r) => {
      const token = r.json();
      setAccessToken(token);
      return token;
    });

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

    const sessionUrl = response.headers.get("Location");
    setUrl(sessionUrl);
  };

  React.useEffect(() => {
    if (!file && !url) return;
    uploadFile(file, url, accessToken, url, (res) => {
      setProgress({
        current: res?.progressNumber?.current,
        end: res?.progressNumber?.end,
      });

      if (res?.status === "Done") {
        setProgress({
          current: res?.progressNumber?.end,
          end: res?.progressNumber?.end,
        });

        setIsUploading(false);

        fetch(
          `http://localhost:9000/.netlify/functions/google-drive?eventType=link&fileId=${res.result.id}`
        )
          .then((r) => r.json())
          .then((response) => {
            setLink(response);
          });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div className={styles.container}>
      <form onSubmit={handleSetResumableSessionUrl}>
        <input
          type="file"
          name="file"
          onChange={(e) => {
            setFileSize(e.target.files[0].size);
            setFile(e.target.files[0]);
          }}
        />
        <button>{isUploading ? "Uploading..." : "Submit"}</button>
      </form>
      <progress id="file" value={progress.current} min={0} max={progress.end} />
      <br />
      {fileSize && formatBytes(fileSize)}
      <br />
      {link?.webViewLink && (
        <a href={link.webViewLink} target="_blank" rel="noreferrer">
          {link.webViewLink}
        </a>
      )}
    </div>
  );
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}