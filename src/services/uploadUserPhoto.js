import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a user profile photo to Firebase Storage and returns the download URL.
 * @param {string} userId - The user's UID
 * @param {File} file - The photo file
 * @returns {Promise<string>} - The download URL
 */
export async function uploadUserPhoto(userId, file) {
  const storage = getStorage();
  const photoRef = ref(storage, `user-photos/${userId}/${file.name}`);
  await uploadBytes(photoRef, file);
  return await getDownloadURL(photoRef);
}
