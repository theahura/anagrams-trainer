import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase.js'
import { validateName } from './nameFilter.js'

const VALID_CATEGORIES = ['anyPercent', 'hundredRed', 'hundredBlue', 'hundredPercent']

function scoresCollection(weekSeed) {
  return collection(db, 'leaderboards', weekSeed, 'scores')
}

export async function submitScore(weekSeed, category, time, playerName) {
  if (!VALID_CATEGORIES.includes(category)) {
    throw new Error(`Invalid category: ${category}`)
  }

  if (typeof time !== 'number' || !isFinite(time) || time <= 0 || time > 3600) {
    throw new Error(`Invalid time: ${time}`)
  }

  const nameResult = validateName(playerName)
  if (!nameResult.valid) {
    throw new Error(nameResult.error)
  }

  await addDoc(scoresCollection(weekSeed), {
    name: playerName.trim(),
    time,
    category,
    weekSeed,
    submittedAt: serverTimestamp(),
  })
}

export async function fetchLeaderboard(weekSeed, category, maxResults = 50) {
  const q = query(
    scoresCollection(weekSeed),
    where('category', '==', category),
    orderBy('time', 'asc'),
    limit(maxResults),
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => doc.data())
}

export async function fetchPlayerRank(weekSeed, category, time) {
  const q = query(
    scoresCollection(weekSeed),
    where('category', '==', category),
    where('time', '<', time),
  )

  const snapshot = await getCountFromServer(q)
  return snapshot.data().count + 1
}
