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

export const uploadFile = async (file, location, callback) => {
  const chunkSize = 52428800; // 50MB (must be multiple of 256kb)
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
      callback({ error: err });
      return;
    }
  }
};
