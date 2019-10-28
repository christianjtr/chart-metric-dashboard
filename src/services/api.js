import axios from 'axios'

const API_COFIGURATION = {
  baseURL: 'http://localhost:8081/api',
  withCredentials: false,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
}

export default() => axios.create({
  baseURL: API_COFIGURATION.baseURL,
  withCredentials: API_COFIGURATION.withCredentials,
  headers: API_COFIGURATION.headers
})
