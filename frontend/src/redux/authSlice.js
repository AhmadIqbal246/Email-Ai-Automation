import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import ENV from '../../config'

// Async thunk for login
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await fetch(`${ENV.API_BASE_URL}/api/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      })

      if (!response.ok) {
        const errorData = await response.json()
        return rejectWithValue(errorData.message || 'Login failed')
      }

      const data = await response.json()
      
      // Store both access and refresh tokens
      localStorage.setItem('authToken', data.token)
      if (data.refresh_token) {
        localStorage.setItem('refreshToken', data.refresh_token)
      }
      
      return data
    } catch (error) {
      return rejectWithValue('Network error. Please try again.')
    }
  }
)

// Async thunk for loading auth state from localStorage
export const loadAuthFromStorage = createAsyncThunk(
  'auth/loadFromStorage',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('authToken')
      const userStr = localStorage.getItem('user')
      
      if (!token) {
        return rejectWithValue('No token found')
      }

      // Try to get user from localStorage first
      let user = null
      if (userStr) {
        try {
          user = JSON.parse(userStr)
        } catch (e) {
          console.warn('Failed to parse stored user data')
        }
      }

      return { user, token }
    } catch (error) {
      return rejectWithValue('Failed to load auth from storage')
    }
  }
)

// Async thunk for token verification (only call when needed)
export const verifyToken = createAsyncThunk(
  'auth/verifyToken',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        return rejectWithValue('No token found')
      }

      const response = await fetch(`${ENV.API_BASE_URL}/api/auth/verify/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      })

      if (!response.ok) {
        // If token verification fails, try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          try {
            const refreshResult = await dispatch(refreshAuthToken()).unwrap()
            return refreshResult
          } catch (refreshError) {
            // If refresh also fails, clear everything
            localStorage.removeItem('authToken')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('user')
            return rejectWithValue('Authentication expired')
          }
        } else {
          localStorage.removeItem('authToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
          return rejectWithValue('Token verification failed')
        }
      }

      const data = await response.json()
      // Store user data for offline access
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
      }
      return data
    } catch (error) {
      // On network errors (like server down), don't clear tokens immediately
      // Just return error but keep tokens for retry
      console.warn('Token verification failed due to network error:', error)
      return rejectWithValue('Network error during token verification')
    }
  }
)

// Async thunk for refresh token
export const refreshAuthToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        return rejectWithValue('No refresh token found')
      }

      const response = await fetch(`${ENV.API_BASE_URL}/api/auth/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      })

      if (!response.ok) {
        localStorage.removeItem('authToken')
        localStorage.removeItem('refreshToken')
        return rejectWithValue('Token refresh failed')
      }

      const data = await response.json()
      localStorage.setItem('authToken', data.token)
      if (data.refresh_token) {
        localStorage.setItem('refreshToken', data.refresh_token)
      }
      
      return data
    } catch (error) {
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      return rejectWithValue('Network error during token refresh')
    }
  }
)

// Async thunk for logout
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        // Optional: Call logout endpoint to invalidate token on server
        await fetch(`${ENV.API_BASE_URL}/api/auth/logout/`, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`
          }
        })
      }
      
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      return null
    } catch (error) {
      // Even if logout fails, clear local storage
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      return null
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: !!localStorage.getItem('authToken'),
    isLoading: true,
    error: null,
    loginLoading: false
  },
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setUser: (state, action) => {
      state.user = action.payload
      state.isAuthenticated = !!action.payload
    },
    clearAuth: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.error = null
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
    },
    setLoadingComplete: (state) => {
      state.isLoading = false
    }
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginUser.pending, (state) => {
        state.loginLoading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loginLoading = false
        state.user = action.payload.user
        state.isAuthenticated = true
        state.error = null
        // Store user data for persistence
        if (action.payload.user) {
          localStorage.setItem('user', JSON.stringify(action.payload.user))
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loginLoading = false
        state.error = action.payload
        state.user = null
        state.isAuthenticated = false
      })
      
      // Load auth from storage cases
      .addCase(loadAuthFromStorage.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(loadAuthFromStorage.rejected, (state) => {
        state.isLoading = false
        state.user = null
        state.isAuthenticated = false
      })
      
      // Token verification cases
      .addCase(verifyToken.pending, (state) => {
        state.isLoading = true
      })
      .addCase(verifyToken.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(verifyToken.rejected, (state, action) => {
        state.isLoading = false
        state.user = null
        state.isAuthenticated = false
        state.error = action.payload
      })
      
      // Token refresh cases
      .addCase(refreshAuthToken.fulfilled, (state, action) => {
        if (action.payload.user) {
          state.user = action.payload.user
          state.isAuthenticated = true
        }
      })
      .addCase(refreshAuthToken.rejected, (state) => {
        state.user = null
        state.isAuthenticated = false
      })
      
      // Logout cases
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated = false
        state.error = null
        state.isLoading = false
      })
  }
})

export const { clearError, setUser, clearAuth, setLoadingComplete } = authSlice.actions
export default authSlice.reducer
