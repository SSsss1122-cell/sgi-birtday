'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Person, PersonFormData } from '@/lib/supabase'

const MONTHS = [
  { value: 'all', label: 'All Months' },
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
]

// Helper to parse month name and day from a date string (YYYY-MM-DD)
function parseBirthdayDate(dateStr: string | null): { month: string; day: number } | null {
  if (!dateStr) return null
  const parts = dateStr.split('-')
  if (parts.length !== 3) return null
  const monthNum = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)
  if (isNaN(monthNum) || isNaN(day)) return null
  const monthName = MONTHS.find(m => m.value === monthNum)?.label || ''
  return { month: monthName, day }
}

// Helper to get month number from a date string
function getMonthNumFromDate(dateStr: string | null): number | null {
  if (!dateStr) return null
  const parts = dateStr.split('-')
  if (parts.length !== 3) return null
  const monthNum = parseInt(parts[1], 10)
  return isNaN(monthNum) ? null : monthNum
}

export default function Home() {
  const [people, setPeople] = useState<Person[]>([])
  const [filteredPeople, setFilteredPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [monthFilter, setMonthFilter] = useState<number | 'all'>('all')
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [admin, setAdmin] = useState<any>(null)
  const [formData, setFormData] = useState<{
    name: string
    department: string
    birthday_date: string  // YYYY-MM-DD with year 2000
    phone_number: string
  }>({
    name: '',
    department: '',
    birthday_date: '',
    phone_number: ''
  })
  const router = useRouter()

  useEffect(() => {
    const adminData = localStorage.getItem('admin')
    if (!adminData) {
      router.push('/login')
      return
    }

    try {
      const parsedAdmin = JSON.parse(adminData)
      setAdmin(parsedAdmin)
      loadPeople()
    } catch (error) {
      localStorage.removeItem('admin')
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    filterPeople()
  }, [searchTerm, people, monthFilter])

  async function loadPeople(): Promise<void> {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('birthdays')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setPeople(data || [])
      setFilteredPeople(data || [])
    } catch (error) {
      showMessage('Error loading people: ' + (error as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function filterPeople(): void {
    let filtered = people

    if (searchTerm.trim()) {
      filtered = filtered.filter(person =>
        person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (person.department && person.department.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (monthFilter !== 'all') {
      filtered = filtered.filter(person => {
        const m = getMonthNumFromDate(person.birthday_date)
        return m === monthFilter
      })
    }

    setFilteredPeople(filtered)
  }

  function showMessage(text: string, type: 'success' | 'error'): void {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  function handleLogout() {
    localStorage.removeItem('admin')
    router.push('/login')
  }

  function openAddModal(): void {
    setEditingId(null)
    setFormData({
      name: '',
      department: '',
      birthday_date: '',
      phone_number: ''
    })
    setIsModalOpen(true)
  }

  function openEditModal(person: Person): void {
    setEditingId(person.id)
    setFormData({
      name: person.name,
      department: person.department || '',
      birthday_date: person.birthday_date || '',
      phone_number: person.phone_number || ''
    })
    setIsModalOpen(true)
  }

  function closeModal(): void {
    setIsModalOpen(false)
    setEditingId(null)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    
    const { name, department, birthday_date, phone_number } = formData

    if (!name || !birthday_date) {
      showMessage('Please fill in all required fields (name and birthday)', 'error')
      return
    }

    // Force the year to 2000 – we extract month and day and rebuild
    const dateParts = birthday_date.split('-')
    if (dateParts.length !== 3) {
      showMessage('Invalid date format. Please pick a valid date.', 'error')
      return
    }
    const year = parseInt(dateParts[0], 10)
    const monthNum = parseInt(dateParts[1], 10)
    const dayNum = parseInt(dateParts[2], 10)
    if (isNaN(monthNum) || isNaN(dayNum) || monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
      showMessage('Please select a valid date.', 'error')
      return
    }

    // Rebuild with year 2000
    const paddedMonth = String(monthNum).padStart(2, '0')
    const paddedDay = String(dayNum).padStart(2, '0')
    const finalDate = `2000-${paddedMonth}-${paddedDay}`

    const data = {
      name: name.trim(),
      department: department.trim() || null,
      phone_number: phone_number.trim() || null,
      birthday_date: finalDate
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('birthdays')
          .update(data)
          .eq('id', editingId)
        if (error) throw error
        showMessage('Person updated successfully!', 'success')
      } else {
        const { error } = await supabase
          .from('birthdays')
          .insert([data])
        if (error) throw error
        showMessage('Person added successfully!', 'success')
      }

      closeModal()
      loadPeople()
    } catch (error) {
      showMessage('Error saving person: ' + (error as Error).message, 'error')
    }
  }

  async function deletePerson(id: number): Promise<void> {
    if (!confirm('Are you sure you want to delete this person?')) return

    try {
      const { error } = await supabase
        .from('birthdays')
        .delete()
        .eq('id', id)
      if (error) throw error
      showMessage('Person deleted successfully!', 'success')
      loadPeople()
    } catch (error) {
      showMessage('Error deleting person: ' + (error as Error).message, 'error')
    }
  }

  // ---------- FULL STYLES ----------
  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '30px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
      minHeight: '100vh',
      background: '#f8f9fc',
      color: '#1a1a2e',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      paddingTop: '10px',
      flexWrap: 'wrap' as const,
      gap: '15px',
    },
    headerLeft: {
      flex: 1,
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#1a1a2e',
      marginBottom: '4px',
      letterSpacing: '-0.5px',
    },
    subtitle: {
      color: '#6c757d',
      fontSize: '1rem',
    },
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap' as const,
    },
    userEmail: {
      color: '#495057',
      fontSize: '14px',
      fontWeight: 500,
    },
    userRole: {
      background: '#4a6cf7',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      color: 'white',
      fontWeight: 600,
    },
    logoutButton: {
      padding: '8px 18px',
      background: '#dc3545',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 6px rgba(220, 53, 69, 0.2)',
    },
    message: {
      padding: '12px 18px',
      borderRadius: '10px',
      marginBottom: '24px',
      fontSize: '14px',
      fontWeight: 500,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    messageSuccess: {
      background: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb',
    },
    messageError: {
      background: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb',
    },
    statsBar: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '20px',
      marginBottom: '30px',
    },
    statItem: {
      background: '#ffffff',
      padding: '18px 20px',
      borderRadius: '14px',
      textAlign: 'center' as const,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0,0,0,0.05)',
      transition: 'all 0.25s ease',
      border: '1px solid #e9ecef',
      cursor: 'default',
    },
    statNumber: {
      display: 'block',
      fontSize: '32px',
      fontWeight: 700,
      color: '#1a1a2e',
      lineHeight: 1.2,
    },
    statLabel: {
      fontSize: '14px',
      color: '#6c757d',
      marginTop: '4px',
      fontWeight: 500,
    },
    toolbar: {
      display: 'flex',
      gap: '15px',
      marginBottom: '28px',
      flexWrap: 'wrap' as const,
      alignItems: 'center',
    },
    searchWrapper: {
      flex: 1,
      position: 'relative' as const,
      minWidth: '200px',
    },
    searchInput: {
      width: '100%',
      padding: '12px 40px 12px 18px',
      border: '2px solid #e9ecef',
      borderRadius: '12px',
      fontSize: '15px',
      background: '#ffffff',
      color: '#1a1a2e',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box' as const,
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    },
    clearSearch: {
      position: 'absolute' as const,
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      color: '#adb5bd',
      cursor: 'pointer',
      fontSize: '18px',
      padding: '4px 8px',
      transition: 'color 0.2s',
    },
    filterWrapper: {
      minWidth: '160px',
    },
    filterSelect: {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e9ecef',
      borderRadius: '12px',
      fontSize: '15px',
      background: '#ffffff',
      color: '#1a1a2e',
      cursor: 'pointer',
      outline: 'none',
      transition: 'all 0.2s ease',
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    },
    addButton: {
      padding: '12px 28px',
      background: '#4a6cf7',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '15px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.25s ease',
      whiteSpace: 'nowrap' as const,
      boxShadow: '0 4px 12px rgba(74, 108, 247, 0.25)',
    },
    tableContainer: {
      background: '#ffffff',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0,0,0,0.03)',
      border: '1px solid #e9ecef',
      overflowX: 'auto' as const,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
    },
    th: {
      background: '#f8f9fc',
      color: '#495057',
      fontWeight: 600,
      fontSize: '13px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      padding: '16px 20px',
      textAlign: 'left' as const,
      borderBottom: '2px solid #e9ecef',
    },
    td: {
      padding: '16px 20px',
      borderBottom: '1px solid #f1f3f5',
      color: '#212529',
      transition: 'background 0.15s ease',
    },
    nameCell: {
      fontWeight: 600,
      color: '#1a1a2e',
    },
    birthdayBadge: {
      display: 'inline-block',
      padding: '6px 16px',
      background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
      color: 'white',
      borderRadius: '30px',
      fontSize: '13px',
      fontWeight: 600,
      boxShadow: '0 2px 8px rgba(238, 90, 36, 0.25)',
    },
    actions: {
      textAlign: 'center' as const,
    },
    editButton: {
      padding: '6px 16px',
      background: '#4a6cf7',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
      marginRight: '6px',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 6px rgba(74, 108, 247, 0.15)',
    },
    deleteButton: {
      padding: '6px 16px',
      background: '#dc3545',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 6px rgba(220, 53, 69, 0.15)',
    },
    loading: {
      textAlign: 'center' as const,
      padding: '60px 20px',
      color: '#6c757d',
    },
    spinner: {
      width: '40px',
      height: '40px',
      margin: '0 auto 15px',
      border: '4px solid #e9ecef',
      borderTopColor: '#4a6cf7',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '60px 20px',
    },
    emptyIcon: {
      fontSize: '64px',
      marginBottom: '15px',
    },
    emptyTitle: {
      color: '#1a1a2e',
      marginBottom: '8px',
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    emptyText: {
      color: '#6c757d',
      marginBottom: '20px',
    },
    modalOverlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    },
    modal: {
      background: '#ffffff',
      borderRadius: '20px',
      maxWidth: '500px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto' as const,
      padding: '32px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
      animation: 'fadeIn 0.25s ease',
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
    },
    modalTitle: {
      fontSize: '24px',
      color: '#1a1a2e',
      fontWeight: 700,
    },
    modalClose: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      color: '#adb5bd',
      cursor: 'pointer',
      padding: '4px 8px',
      transition: 'color 0.2s',
    },
    formGroup: {
      marginBottom: '20px',
    },
    formLabel: {
      display: 'block',
      fontSize: '14px',
      fontWeight: 600,
      color: '#495057',
      marginBottom: '6px',
    },
    formInput: {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e9ecef',
      borderRadius: '10px',
      fontSize: '15px',
      background: '#ffffff',
      color: '#1a1a2e',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box' as const,
    },
    formRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '15px',
    },
    formActions: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '28px',
    },
    cancelButton: {
      padding: '10px 24px',
      background: '#f1f3f5',
      color: '#495057',
      border: 'none',
      borderRadius: '10px',
      fontSize: '15px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    saveButton: {
      padding: '10px 28px',
      background: '#4a6cf7',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontSize: '15px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 4px 12px rgba(74, 108, 247, 0.25)',
    },
  }

  if (!admin) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>👥 People Directory</h1>
          <p style={styles.subtitle}>Manage all your people and their birthdays</p>
        </div>
        <div style={styles.userInfo}>
          <span style={styles.userEmail}>{admin.admin_name || admin.mobile_number}</span>
          <span style={styles.userRole}>{admin.role || 'Admin'}</span>
          <button 
            style={styles.logoutButton}
            onClick={handleLogout}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#c82333'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 14px rgba(220, 53, 69, 0.35)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#dc3545'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(220, 53, 69, 0.2)'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {message && (
        <div style={{
          ...styles.message,
          ...(message.type === 'success' ? styles.messageSuccess : styles.messageError)
        }}>
          {message.text}
        </div>
      )}

      <div style={styles.statsBar}>
        {[
          { label: 'Total People', value: people.length },
          { label: 'Upcoming Birthdays', value: people.filter(p => {
            const date = p.birthday_date
            if (!date) return false
            const today = new Date()
            const currentMonth = today.getMonth() + 1
            const currentDay = today.getDate()
            const m = getMonthNumFromDate(date)
            const day = parseInt(date.split('-')[2], 10)
            if (m === null || isNaN(day)) return false
            return (m > currentMonth || (m === currentMonth && day >= currentDay))
          }).length },
          { label: 'With Department', value: people.filter(p => p.department).length }
        ].map((stat, idx) => (
          <div 
            key={idx} 
            style={styles.statItem}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.08)'
              e.currentTarget.style.borderColor = '#4a6cf7'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0,0,0,0.05)'
              e.currentTarget.style.borderColor = '#e9ecef'
            }}
          >
            <span style={styles.statNumber}>{stat.value}</span>
            <span style={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchWrapper}>
          <input
            type="text"
            style={styles.searchInput}
            placeholder="🔍 Search by name or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={(e) => {
              e.target.style.borderColor = '#4a6cf7'
              e.target.style.boxShadow = '0 0 0 4px rgba(74, 108, 247, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e9ecef'
              e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'
            }}
          />
          {searchTerm && (
            <button 
              style={styles.clearSearch}
              onClick={() => setSearchTerm('')}
              onMouseEnter={(e) => e.currentTarget.style.color = '#495057'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#adb5bd'}
            >
              ✕
            </button>
          )}
        </div>

        <div style={styles.filterWrapper}>
          <select
            style={styles.filterSelect}
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            onFocus={(e) => {
              e.target.style.borderColor = '#4a6cf7'
              e.target.style.boxShadow = '0 0 0 4px rgba(74, 108, 247, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e9ecef'
              e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            {MONTHS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <button 
          style={styles.addButton}
          onClick={openAddModal}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#3a5cd5'
            e.currentTarget.style.transform = 'translateY(-3px)'
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(74, 108, 247, 0.35)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#4a6cf7'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(74, 108, 247, 0.25)'
          }}
        >
          + Add Person
        </button>
      </div>

      {loading ? (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      ) : (
        <>
          {filteredPeople.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>👤</div>
              <h3 style={styles.emptyTitle}>No people found</h3>
              <p style={styles.emptyText}>
                {people.length === 0 
                  ? 'Get started by adding your first person!' 
                  : 'No results match your filters.'}
              </p>
              {people.length === 0 && (
                <button 
                  style={styles.addButton}
                  onClick={openAddModal}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#3a5cd5'
                    e.currentTarget.style.transform = 'translateY(-3px)'
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(74, 108, 247, 0.35)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#4a6cf7'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(74, 108, 247, 0.25)'
                  }}
                >
                  + Add Person
                </button>
              )}
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Department</th>
                    <th style={styles.th}>Birthday</th>
                    <th style={styles.th}>Phone</th>
                    <th style={{...styles.th, textAlign: 'center'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeople.map((person) => {
                    const parsed = parseBirthdayDate(person.birthday_date)
                    return (
                      <tr 
                        key={person.id}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f8f9fc'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <td style={styles.td}>
                          <span style={styles.nameCell}>{person.name}</span>
                        </td>
                        <td style={styles.td}>{person.department || '-'}</td>
                        <td style={styles.td}>
                          <span style={styles.birthdayBadge}>
                            {parsed ? `${parsed.month} ${parsed.day}` : '-'}
                          </span>
                        </td>
                        <td style={styles.td}>{person.phone_number || '-'}</td>
                        <td style={{...styles.td, textAlign: 'center'}}>
                          <button 
                            style={styles.editButton}
                            onClick={() => openEditModal(person)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#3a5cd5'
                              e.currentTarget.style.transform = 'translateY(-2px)'
                              e.currentTarget.style.boxShadow = '0 6px 14px rgba(74, 108, 247, 0.3)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#4a6cf7'
                              e.currentTarget.style.transform = 'translateY(0)'
                              e.currentTarget.style.boxShadow = '0 2px 6px rgba(74, 108, 247, 0.15)'
                            }}
                          >
                            Edit
                          </button>
                          <button 
                            style={styles.deleteButton}
                            onClick={() => deletePerson(person.id)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#c82333'
                              e.currentTarget.style.transform = 'translateY(-2px)'
                              e.currentTarget.style.boxShadow = '0 6px 14px rgba(220, 53, 69, 0.3)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#dc3545'
                              e.currentTarget.style.transform = 'translateY(0)'
                              e.currentTarget.style.boxShadow = '0 2px 6px rgba(220, 53, 69, 0.15)'
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal with Date Picker */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editingId ? 'Edit Person' : 'Add Person'}</h2>
              <button 
                style={styles.modalClose}
                onClick={closeModal}
                onMouseEnter={(e) => e.currentTarget.style.color = '#1a1a2e'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#adb5bd'}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter full name"
                  style={styles.formInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4a6cf7'
                    e.target.style.boxShadow = '0 0 0 4px rgba(74, 108, 247, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e9ecef'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  placeholder="Enter department"
                  style={styles.formInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4a6cf7'
                    e.target.style.boxShadow = '0 0 0 4px rgba(74, 108, 247, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e9ecef'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Birthday *</label>
                <input
                  type="date"
                  name="birthday_date"
                  value={formData.birthday_date}
                  onChange={handleInputChange}
                  required
                  style={styles.formInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4a6cf7'
                    e.target.style.boxShadow = '0 0 0 4px rgba(74, 108, 247, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e9ecef'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                  Pick any date – the year will be stored as 2000.
                </p>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Phone Number</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                  style={styles.formInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4a6cf7'
                    e.target.style.boxShadow = '0 0 0 4px rgba(74, 108, 247, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e9ecef'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
              <div style={styles.formActions}>
                <button 
                  type="button" 
                  style={styles.cancelButton}
                  onClick={closeModal}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e9ecef'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f1f3f5'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={styles.saveButton}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#3a5cd5'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(74, 108, 247, 0.35)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#4a6cf7'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(74, 108, 247, 0.25)'
                  }}
                >
                  {editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-16px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        /* Additional hover effects */
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
          border-color: #4a6cf7;
        }
        button {
          cursor: pointer;
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f3f5;
        }
        ::-webkit-scrollbar-thumb {
          background: #ced4da;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #adb5bd;
        }
      `}</style>
    </div>
  )
}