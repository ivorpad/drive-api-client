export const getWebLink = (fileId) => {
  return async function(token) {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink,webContentLink`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    ).then((response) => response.json());

    return response
  }
}