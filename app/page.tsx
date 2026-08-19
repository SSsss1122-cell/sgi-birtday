'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Person, PersonFormData } from '@/lib/supabase'

export default function Home() {
  const [people, setPeople] = useState<Person[]>([])
  const [filteredPeople, setFilteredPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [admin, setAdmin] = useState<any>(null)
  const [formData, setFormData] = useState<PersonFormData>({
    name: '',
    department: '',
    dob_month: '',
    dob_day: '',
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
  }, [searchTerm, people])

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
    if (!searchTerm.trim()) {
      setFilteredPeople(people)
      return
    }

    const filtered = people.filter(person => 
      person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (person.department && person.department.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredPeople(filtered)
  }

  function showMessage(text: string, type: 'success' | 'error'): void {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  function getMonthNumber(monthName: string): number {
    const months: Record<string, number> = {
      'january': 1, 'jan': 1,
      'february': 2, 'feb': 2,
      'march': 3, 'mar': 3,
      'april': 4, 'apr': 4,
      'may': 5,
      'june': 6, 'jun': 6,
      'july': 7, 'jul': 7,
      'august': 8, 'aug': 8,
      'september': 9, 'sep': 9,
      'october': 10, 'oct': 10,
      'november': 11, 'nov': 11,
      'december': 12, 'dec': 12
    }
    return months[monthName.toLowerCase().trim()] || 0
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
      dob_month: '',
      dob_day: '',
      phone_number: ''
    })
    setIsModalOpen(true)
  }

  function openEditModal(person: Person): void {
    setEditingId(person.id)
    setFormData({
      name: person.name,
      department: person.department || '',
      dob_month: person.dob_month,
      dob_day: person.dob_day?.toString() || '',
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
    
    const { name, department, dob_month, dob_day, phone_number } = formData
    const dobDayNum = parseInt(dob_day)
    const dobMonthNum = getMonthNumber(dob_month)

    if (!name || !dob_month || !dob_day) {
      showMessage('Please fill in all required fields', 'error')
      return
    }

    if (isNaN(dobDayNum) || dobDayNum < 1 || dobDayNum > 31) {
      showMessage('Please enter a valid day (1-31)', 'error')
      return
    }

    if (dobMonthNum === 0) {
      showMessage('Please enter a valid month name', 'error')
      return
    }

    const data = {
      name: name.trim(),
      department: department.trim() || null,
      dob_month: dob_month.trim(),
      dob_day: dobDayNum,
      phone_number: phone_number.trim() || null,
      dob_month_num: dobMonthNum
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

  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
      minHeight: '100vh',
      background: '#000000',
      color: '#ffffff',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      paddingTop: '20px',
      flexWrap: 'wrap' as const,
      gap: '15px',
    },
    headerLeft: {
      flex: 1,
    },
    title: {
      fontSize: '2.5rem',
      color: '#ffffff',
      marginBottom: '5px',
    },
    subtitle: {
      color: '#888',
      fontSize: '1rem',
    },
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    userEmail: {
      color: '#aaa',
      fontSize: '14px',
    },
    userRole: {
      background: '#4a6cf7',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      color: 'white',
    },
    logoutButton: {
      padding: '8px 16px',
      background: '#dc3545',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all 0.2s',
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
    statsBar: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '15px',
      marginBottom: '25px',
    },
    statItem: {
      background: '#1a1a1a',
      padding: '15px',
      borderRadius: '10px',
      textAlign: 'center' as const,
      border: '1px solid #333',
    },
    statNumber: {
      display: 'block',
      fontSize: '28px',
      fontWeight: 700,
      color: '#ffffff',
    },
    statLabel: {
      fontSize: '13px',
      color: '#888',
      marginTop: '4px',
    },
    toolbar: {
      display: 'flex',
      gap: '15px',
      marginBottom: '25px',
      flexWrap: 'wrap' as const,
    },
    searchWrapper: {
      flex: 1,
      position: 'relative' as const,
      minWidth: '200px',
    },
    searchInput: {
      width: '100%',
      padding: '12px 40px 12px 16px',
      border: '2px solid #333',
      borderRadius: '8px',
      fontSize: '15px',
      background: '#1a1a1a',
      color: '#ffffff',
      boxSizing: 'border-box' as const,
    },
    clearSearch: {
      position: 'absolute' as const,
      right: '10px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      color: '#666',
      cursor: 'pointer',
      fontSize: '18px',
      padding: '4px 8px',
    },
    addButton: {
      padding: '12px 24px',
      background: '#4a6cf7',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s',
      whiteSpace: 'nowrap' as const,
    },
    tableContainer: {
      background: '#0d0d0d',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #1a1a1a',
      overflowX: 'auto' as const,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
    },
    th: {
      background: '#1a1a1a',
      color: '#aaa',
      fontWeight: 600,
      fontSize: '13px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.3px',
      padding: '14px 16px',
      textAlign: 'left' as const,
      borderBottom: '2px solid #2a2a2a',
    },
    td: {
      padding: '14px 16px',
      borderBottom: '1px solid #1a1a1a',
      color: '#e0e0e0',
    },
    nameCell: {
      fontWeight: 600,
      color: '#ffffff',
    },
    birthdayBadge: {
      display: 'inline-block',
      padding: '4px 12px',
      background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
      color: 'white',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: 500,
    },
    actions: {
      textAlign: 'center' as const,
    },
    editButton: {
      padding: '6px 14px',
      background: '#4a6cf7',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      cursor: 'pointer',
      marginRight: '6px',
      transition: 'all 0.2s',
    },
    deleteButton: {
      padding: '6px 14px',
      background: '#dc3545',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    loading: {
      textAlign: 'center' as const,
      padding: '60px 20px',
      color: '#666',
    },
    spinner: {
      width: '40px',
      height: '40px',
      margin: '0 auto 15px',
      border: '3px solid #2a2a2a',
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
      color: '#ffffff',
      marginBottom: '8px',
    },
    emptyText: {
      color: '#888',
      marginBottom: '20px',
    },
    modalOverlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    },
    modal: {
      background: '#1a1a1a',
      borderRadius: '16px',
      maxWidth: '500px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto' as const,
      padding: '28px',
      border: '1px solid #333',
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
    },
    modalTitle: {
      fontSize: '22px',
      color: '#ffffff',
    },
    modalClose: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      color: '#666',
      cursor: 'pointer',
      padding: '4px 8px',
    },
    formGroup: {
      marginBottom: '18px',
    },
    formLabel: {
      display: 'block',
      fontSize: '14px',
      fontWeight: 500,
      color: '#aaa',
      marginBottom: '5px',
    },
    formInput: {
      width: '100%',
      padding: '10px 14px',
      border: '2px solid #333',
      borderRadius: '8px',
      fontSize: '15px',
      background: '#0d0d0d',
      color: '#ffffff',
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
      marginTop: '24px',
    },
    cancelButton: {
      padding: '10px 24px',
      background: '#333',
      color: '#aaa',
      border: 'none',
      borderRadius: '8px',
      fontSize: '15px',
      cursor: 'pointer',
    },
    saveButton: {
      padding: '10px 24px',
      background: '#4a6cf7',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: 500,
      cursor: 'pointer',
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
            onMouseEnter={(e) => e.currentTarget.style.background = '#c82333'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#dc3545'}
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
        <div style={styles.statItem}>
          <span style={styles.statNumber}>{people.length}</span>
          <span style={styles.statLabel}>Total People</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statNumber}>
            {people.filter(p => {
              const today = new Date()
              const currentMonth = today.getMonth() + 1
              const currentDay = today.getDate()
              return p.dob_month_num && p.dob_day && 
                     (p.dob_month_num > currentMonth || 
                      (p.dob_month_num === currentMonth && p.dob_day >= currentDay))
            }).length}
          </span>
          <span style={styles.statLabel}>Upcoming Birthdays</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statNumber}>
            {people.filter(p => p.department).length}
          </span>
          <span style={styles.statLabel}>With Department</span>
        </div>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchWrapper}>
          <input
            type="text"
            style={styles.searchInput}
            placeholder="🔍 Search by name or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={(e) => e.target.style.borderColor = '#4a6cf7'}
            onBlur={(e) => e.target.style.borderColor = '#333'}
          />
          {searchTerm && (
            <button 
              style={styles.clearSearch}
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>
        <button 
          style={styles.addButton}
          onClick={openAddModal}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#3a5cd5'
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(74, 108, 247, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#4a6cf7'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
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
                  : 'No results match your search.'}
              </p>
              {people.length === 0 && (
                <button 
                  style={styles.addButton}
                  onClick={openAddModal}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#3a5cd5'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(74, 108, 247, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#4a6cf7'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
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
                  {filteredPeople.map((person) => (
                    <tr key={person.id}>
                      <td style={styles.td}>
                        <span style={styles.nameCell}>{person.name}</span>
                      </td>
                      <td style={styles.td}>{person.department || '-'}</td>
                      <td style={styles.td}>
                        <span style={styles.birthdayBadge}>
                          {person.dob_month} {person.dob_day}
                        </span>
                      </td>
                      <td style={styles.td}>{person.phone_number || '-'}</td>
                      <td style={{...styles.td, textAlign: 'center'}}>
                        <button 
                          style={styles.editButton}
                          onClick={() => openEditModal(person)}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#3a5cd5'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#4a6cf7'}
                        >
                          Edit
                        </button>
                        <button 
                          style={styles.deleteButton}
                          onClick={() => deletePerson(person.id)}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#c82333'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#dc3545'}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editingId ? 'Edit Person' : 'Add Person'}</h2>
              <button 
                style={styles.modalClose}
                onClick={closeModal}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
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
                  onFocus={(e) => e.target.style.borderColor = '#4a6cf7'}
                  onBlur={(e) => e.target.style.borderColor = '#333'}
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
                  onFocus={(e) => e.target.style.borderColor = '#4a6cf7'}
                  onBlur={(e) => e.target.style.borderColor = '#333'}
                />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Birth Month *</label>
                  <input
                    type="text"
                    name="dob_month"
                    value={formData.dob_month}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., January"
                    style={styles.formInput}
                    onFocus={(e) => e.target.style.borderColor = '#4a6cf7'}
                    onBlur={(e) => e.target.style.borderColor = '#333'}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Birth Day *</label>
                  <input
                    type="number"
                    name="dob_day"
                    value={formData.dob_day}
                    onChange={handleInputChange}
                    required
                    min="1"
                    max="31"
                    placeholder="Day"
                    style={styles.formInput}
                    onFocus={(e) => e.target.style.borderColor = '#4a6cf7'}
                    onBlur={(e) => e.target.style.borderColor = '#333'}
                  />
                </div>
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
                  onFocus={(e) => e.target.style.borderColor = '#4a6cf7'}
                  onBlur={(e) => e.target.style.borderColor = '#333'}
                />
              </div>
              <div style={styles.formActions}>
                <button 
                  type="button" 
                  style={styles.cancelButton}
                  onClick={closeModal}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#444'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#333'}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={styles.saveButton}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#3a5cd5'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#4a6cf7'
                    e.currentTarget.style.transform = 'translateY(0)'
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
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .loginBox {
          animation: fadeIn 0.5s ease;
        }
      `}</style>
    </div>
  )
}