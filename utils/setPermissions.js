export const setPermissions = (fileId, permissions) => {
  return async function(token) {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      {
        method: "POST",
        body: JSON.stringify(permissions),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    ).then((r) => r.json());

    return response;
  }
};