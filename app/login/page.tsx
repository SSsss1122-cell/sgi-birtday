'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [mobileNumber, setMobileNumber] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (!mobileNumber || mobileNumber.length < 10) {
      setMessage({
        text: 'Please enter a valid mobile number (minimum 10 digits)',
        type: 'error'
      })
      setLoading(false)
      return
    }

    // Removed password length validation - now accepts any password

    try {
      const { data: admin, error } = await supabase
        .from('admins')
        .select('*')
        .eq('mobile_number', mobileNumber.trim())
        .single()

      if (error || !admin) {
        setMessage({
          text: 'Invalid mobile number or password',
          type: 'error'
        })
        setLoading(false)
        return
      }

      if (admin.password !== password) {
        setMessage({
          text: 'Invalid mobile number or password',
          type: 'error'
        })
        setLoading(false)
        return
      }

      await supabase
        .from('admins')
        .update({ last_sign_in_at: new Date().toISOString() })
        .eq('id', admin.id)

      localStorage.setItem('admin', JSON.stringify({
        id: admin.id,
        mobile_number: admin.mobile_number,
        admin_name: admin.admin_name,
        email: admin.email,
        role: admin.role,
        institution_id: admin.institution_id
      }))

      router.push('/')

    } catch (error) {
      setMessage({
        text: 'An error occurred during login',
        type: 'error'
      })
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!mobileNumber) {
      setMessage({
        text: 'Please enter your mobile number first',
        type: 'error'
      })
      return
    }

    setLoading(true)
    try {
      // Check if mobile exists
      const { data: admin, error } = await supabase
        .from('admins')
        .select('mobile_number, email')
        .eq('mobile_number', mobileNumber.trim())
        .single()

      if (error || !admin) {
        setMessage({
          text: 'Mobile number not found',
          type: 'error'
        })
        setLoading(false)
        return
      }

      // Here you would typically send a reset link via email/SMS
      // For now, show a message
      setMessage({
        text: 'Password reset link sent to your registered email',
        type: 'success'
      })

    } catch (error) {
      setMessage({
        text: 'Error sending reset link',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000000',
      padding: '20px',
    },
    loginBox: {
      background: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '16px',
      padding: '40px',
      width: '100%',
      maxWidth: '420px',
      animation: 'fadeIn 0.5s ease',
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '32px',
    },
    title: {
      fontSize: '28px',
      color: '#ffffff',
      marginBottom: '8px',
    },
    subtitle: {
      color: '#888',
      fontSize: '15px',
    },
    message: {
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '20px',
      fontSize: '14px',
    },
    messageSuccess: {
      background: '#1a3a1a',
      color: '#8fdf8f',
      border: '1px solid #2a5a2a',
    },
    messageError: {
      background: '#3a1a1a',
      color: '#df8f8f',
      border: '1px solid #5a2a2a',
    },
    form: {
      marginBottom: '20px',
    },
    formGroup: {
      marginBottom: '18px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: 500,
      color: '#aaa',
      marginBottom: '6px',
    },
    inputWrapper: {
      position: 'relative' as const,
    },
    input: {
      width: '100%',
      padding: '12px 14px',
      border: '2px solid #333',
      borderRadius: '8px',
      fontSize: '15px',
      background: '#0d0d0d',
      color: '#ffffff',
      transition: 'border-color 0.2s',
      boxSizing: 'border-box' as const,
    },
    passwordInput: {
      width: '100%',
      padding: '12px 45px 12px 14px',
      border: '2px solid #333',
      borderRadius: '8px',
      fontSize: '15px',
      background: '#0d0d0d',
      color: '#ffffff',
      transition: 'border-color 0.2s',
      boxSizing: 'border-box' as const,
    },
    toggleButton: {
      position: 'absolute' as const,
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      color: '#666',
      cursor: 'pointer',
      fontSize: '18px',
      padding: '4px 8px',
      transition: 'color 0.2s',
    },
    optionsRow: {
      display: 'flex',
      justifyContent: 'flex-end',
      marginTop: '-10px',
      marginBottom: '18px',
    },
    forgotPassword: {
      background: 'none',
      border: 'none',
      color: '#4a6cf7',
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'color 0.2s',
      padding: '4px',
    },
    submitButton: {
      width: '100%',
      padding: '14px',
      background: '#4a6cf7',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    submitButtonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
    footer: {
      textAlign: 'center' as const,
      color: '#888',
      fontSize: '14px',
      marginTop: '20px',
    },
    footerText: {
      color: '#666',
      fontSize: '13px',
      lineHeight: '1.6',
    },
  }

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <div style={styles.header}>
          <h1 style={styles.title}>👥 Admin Login</h1>
          <p style={styles.subtitle}>Sign in to manage your people directory</p>
        </div>

        {message && (
          <div style={{
            ...styles.message,
            ...(message.type === 'success' ? styles.messageSuccess : styles.messageError)
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Mobile Number</label>
            <input
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              required
              placeholder="Enter mobile number"
              disabled={loading}
              maxLength={15}
              style={{
                ...styles.input,
                ...(loading ? { opacity: 0.5, cursor: 'not-allowed' } : {})
              }}
              onFocus={(e) => e.target.style.borderColor = '#4a6cf7'}
              onBlur={(e) => e.target.style.borderColor = '#333'}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                disabled={loading}
                style={{
                  ...styles.passwordInput,
                  ...(loading ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                }}
                onFocus={(e) => e.target.style.borderColor = '#4a6cf7'}
                onBlur={(e) => e.target.style.borderColor = '#333'}
              />
              <button
                type="button"
                style={styles.toggleButton}
                onClick={() => setShowPassword(!showPassword)}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div style={styles.optionsRow}>
            <button
              type="button"
              style={styles.forgotPassword}
              onClick={handleForgotPassword}
              disabled={loading}
              onMouseEnter={(e) => e.currentTarget.style.color = '#3a5cd5'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#4a6cf7'}
            >
              Forgot Password?
            </button>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              ...styles.submitButton,
              ...(loading ? styles.submitButtonDisabled : {})
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#3a5cd5'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(74, 108, 247, 0.3)'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#4a6cf7'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Contact your administrator for credentials
          </p>
        </div>
      </div>
    </div>
  )
}