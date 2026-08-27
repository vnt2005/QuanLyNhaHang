import { useAutoDismissMessage } from '../hooks/useAutoDismissMessage'
import { confirmAction } from '../components/ConfirmDialog'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  createRole,
  deactivateRole,
  deleteUser,
  getRolePermissionSelection,
  getRoles,
  getUsers,
  syncSystemRoles,
  updateRole,
  updateRolePermissions,
  updateUser,
  type PermissionSelection,
  type Role,
  type RoleForm,
  type UserAccount,
  type UserForm,
} from '../services/access'

const emptyRoleForm: RoleForm = {
  name: '',
  displayName: '',
  description: '',
  isActive: true,
}

function ChevronRightIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
}

function UserCogIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M3.5 19c.5-3.5 2.3-5.5 5.5-5.5 2 0 3.4.7 4.3 2" /><circle cx="17.5" cy="17" r="2.5" /><path d="M17.5 12.8v1.7m0 5v1.7m-4.2-4.2H15m5 0h1.7" /></svg>
}

function ShieldIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.7 2.8 8 7 10 4.2-2 7-5.3 7-10V6l-7-3Z" /><path d="m9.5 12 1.7 1.7 3.6-4" /></svg>
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
}

function SyncIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M6.1 8.3A7 7 0 0 1 18.8 7M5.2 17A7 7 0 0 0 17.9 15.7" /></svg>
}

function EditIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 6.5 17.5 10.5" /><path d="m4 20 4.2-1 10.6-10.6a2 2 0 0 0-2.8-2.8L5.4 16.2 4 20Z" /></svg>
}

function TrashIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7" /><path d="M10 11v5m4-5v5" /></svg>
}

function KeyIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4" /><path d="m11 12 7-7m-2 2 2 2m-5 1 2 2" /></svg>
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
}

function ArrowLeftIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
}

function ArrowRightIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
}

export default function AccessManagementPage() {
  const [tab, setTab] = useState<'users' | 'roles'>('users')
  const [users, setUsers] = useState<UserAccount[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [keyword, setKeyword] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState('')
  const [roleKeyword, setRoleKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useAutoDismissMessage(message, setMessage)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userForm, setUserForm] = useState<UserForm | null>(null)
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [roleForm, setRoleForm] = useState<RoleForm>(emptyRoleForm)
  const [permissionModalOpen, setPermissionModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [permissions, setPermissions] = useState<PermissionSelection[]>([])
  const [permissionSearch, setPermissionSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState('')

  async function loadUsers(
    targetPage = page,
    search = keyword,
    roleFilter = userRoleFilter,
    statusFilter = userStatusFilter,
  ) {
    setLoading(true)
    setError('')
    try {
      const result = await getUsers(search, targetPage, 10, {
        role: roleFilter || undefined,
        isActive: statusFilter
          ? statusFilter === 'active'
          : undefined,
      })
      setUsers(result.items ?? [])
      setPage(result.pageNumber || targetPage)
      setTotalPages(Math.max(result.totalPages || 1, 1))
      setTotalCount(result.totalCount || 0)
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không tải được danh sách tài khoản.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadRoles() {
    setLoading(true)
    setError('')
    try {
      setRoles(await getRoles())
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không tải được danh sách vai trò.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void Promise.all([loadUsers(1, ''), loadRoles()])
  }, [])

  const hasOpenModal = userModalOpen || roleModalOpen || permissionModalOpen

  useEffect(() => {
    if (!hasOpenModal) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || saving) return
      setUserModalOpen(false)
      setRoleModalOpen(false)
      setPermissionModalOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [hasOpenModal, saving])

  function openUser(user: UserAccount) {
    setUserForm({
      id: user.id,
      ho: user.ho ?? '',
      ten: user.ten,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isActive: user.isActive,
    })
    setError('')
    setMessage('')
    setUserModalOpen(true)
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!userForm) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await updateUser(userForm)
      setMessage(result.message ?? 'Cập nhật tài khoản thành công.')
      setUserModalOpen(false)
      await loadUsers(page, keyword)
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không cập nhật được tài khoản.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function removeUser(user: UserAccount) {
    const displayName = [user.ho, user.ten].filter(Boolean).join(' ')
    const accepted = await confirmAction(
      `Xóa vĩnh viễn tài khoản ${displayName} (${user.email})?\n\n`
      + 'Dữ liệu đăng nhập và các phiên của tài khoản sẽ bị xóa. '
      + 'Thao tác này không thể hoàn tác.',
    )
    if (!accepted) return

    setDeletingUserId(user.id)
    setError('')
    setMessage('')
    try {
      const result = await deleteUser(user.id)
      setMessage(result.message ?? 'Xóa tài khoản thành công.')
      const targetPage = users.length === 1 && page > 1 ? page - 1 : page
      await loadUsers(targetPage, keyword)
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không xóa được tài khoản.',
      )
    } finally {
      setDeletingUserId('')
    }
  }

  function openCreateRole() {
    setRoleForm(emptyRoleForm)
    setError('')
    setMessage('')
    setRoleModalOpen(true)
  }

  function openEditRole(role: Role) {
    setRoleForm({
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description ?? '',
      isActive: role.isActive,
    })
    setError('')
    setMessage('')
    setRoleModalOpen(true)
  }

  async function saveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = roleForm.id
        ? await updateRole(roleForm)
        : await createRole(roleForm)
      setMessage(result.message ?? 'Lưu vai trò thành công.')
      setRoleModalOpen(false)
      await loadRoles()
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không lưu được vai trò.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function disableRole(role: Role) {
    if (!await confirmAction(`Vô hiệu hóa vai trò ${role.displayName}?`)) return
    setError('')
    setMessage('')
    try {
      const result = await deactivateRole(role.id)
      setMessage(result.message ?? 'Đã vô hiệu hóa vai trò.')
      await loadRoles()
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không thể vô hiệu hóa vai trò.',
      )
    }
  }

  async function synchronizeRoles() {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await syncSystemRoles()
      setMessage(result.message ?? 'Đồng bộ vai trò hệ thống thành công.')
      await loadRoles()
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không đồng bộ được vai trò.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function openPermissions(role: Role) {
    setSelectedRole(role)
    setPermissionSearch('')
    setPermissions([])
    setError('')
    setMessage('')
    setSaving(true)
    try {
      const result = await getRolePermissionSelection(role.id)
      setPermissions(result.permissions)
      setPermissionModalOpen(true)
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không tải được danh sách quyền.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function savePermissions() {
    if (!selectedRole) return
    const permissionIds = permissions
      .filter((item) => item.isSelected)
      .map((item) => item.permissionId)
    if (
      permissionIds.length === 0
      && !await confirmAction('Bạn đang bỏ toàn bộ quyền của vai trò này. Tiếp tục?')
    ) return

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await updateRolePermissions(selectedRole.id, permissionIds)
      setMessage(result.message ?? 'Cập nhật quyền thành công.')
      setPermissionModalOpen(false)
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không cập nhật được quyền.',
      )
    } finally {
      setSaving(false)
    }
  }

  const activeRoles = roles.filter((role) => role.isActive)
  const filteredRoles = useMemo(() => {
    const text = roleKeyword.trim().toLowerCase()
    if (!text) return roles
    return roles.filter((role) => (
      `${role.name} ${role.displayName} ${role.description ?? ''}`
        .toLowerCase()
        .includes(text)
    ))
  }, [roleKeyword, roles])
  const filteredPermissions = useMemo(() => {
    const text = permissionSearch.trim().toLowerCase()
    if (!text) return permissions
    return permissions.filter((permission) => (
      `${permission.permissionCode} ${permission.permissionName} ${permission.permissionGroupName}`
        .toLowerCase()
        .includes(text)
    ))
  }, [permissions, permissionSearch])

  const permissionGroups = useMemo(() => {
    const groups = new Map<string, PermissionSelection[]>()
    for (const permission of filteredPermissions) {
      const list = groups.get(permission.permissionGroupName) ?? []
      list.push(permission)
      groups.set(permission.permissionGroupName, list)
    }
    return [...groups.entries()]
  }, [filteredPermissions])

  return (
    <section className="access-page">
      <div className="access-command-bar">
        <div className="access-breadcrumb" aria-label="Vị trí hiện tại">
          <span>Kiểm soát</span>
          <ChevronRightIcon />
          <strong>{tab === 'users' ? 'Tài khoản' : 'Vai trò'}</strong>
        </div>
        {tab === 'roles' && (
          <div className="toolbar-actions">
            <button
              type="button"
              className="access-sync-button"
              onClick={() => void synchronizeRoles()}
              disabled={saving}
            >
              <SyncIcon />
              <span>{saving ? 'Đang đồng bộ' : 'Đồng bộ'}</span>
            </button>
            <button
              type="button"
              className="primary-button access-primary-button"
              onClick={openCreateRole}
            >
              <PlusIcon />
              <span>Thêm vai trò</span>
            </button>
          </div>
        )}
      </div>

      <div className="access-tabs" role="tablist" aria-label="Nội dung phân quyền">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'users'}
          className={tab === 'users' ? 'active' : ''}
          onClick={() => setTab('users')}
        >
          <UserCogIcon />
          Tài khoản ({totalCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'roles'}
          className={tab === 'roles' ? 'active' : ''}
          onClick={() => setTab('roles')}
        >
          <ShieldIcon />
          Vai trò ({roles.length})
        </button>
      </div>

      {message && <div className="inline-alert success">{message}</div>}
      {error && <div className="inline-alert error">{error}</div>}

      {tab === 'users' ? (
        <>
          <form
            className="access-filter-band"
            onSubmit={(event) => {
              event.preventDefault()
              void loadUsers(1, keyword, userRoleFilter, userStatusFilter)
            }}
          >
            <label className="access-search-field">
              <span className="sr-only">Tìm kiếm tài khoản</span>
              <SearchIcon />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Tìm họ tên, email, số điện thoại..."
              />
              {keyword && (
                <button
                  type="button"
                  className="access-clear-button"
                  aria-label="Xóa từ khóa tìm kiếm"
                  onClick={() => {
                    setKeyword('')
                    void loadUsers(1, '', userRoleFilter, userStatusFilter)
                  }}
                >
                  <CloseIcon />
                </button>
              )}
            </label>
            <label className="access-filter-field">
              <span>Vai trò</span>
              <select
                value={userRoleFilter}
                onChange={(event) => {
                  const value = event.target.value
                  setUserRoleFilter(value)
                  void loadUsers(1, keyword, value, userStatusFilter)
                }}
              >
                <option value="">Tất cả vai trò</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>{role.displayName}</option>
                ))}
              </select>
            </label>
            <label className="access-filter-field">
              <span>Trạng thái</span>
              <select
                value={userStatusFilter}
                onChange={(event) => {
                  const value = event.target.value
                  setUserStatusFilter(value)
                  void loadUsers(1, keyword, userRoleFilter, value)
                }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Đã khóa</option>
              </select>
            </label>
            <button type="submit" className="sr-only">Tìm kiếm</button>
          </form>

          <div className="access-result-row">
            <span>Tìm thấy <strong>{totalCount}</strong> tài khoản</span>
          </div>

          <div className="access-table-panel table-card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Liên hệ</th>
                    <th>Vai trò</th>
                    <th>Xác minh email</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="empty-state">Đang tải dữ liệu...</td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-state">Không có tài khoản phù hợp.</td>
                    </tr>
                  ) : users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="employee-cell">
                          <span>{user.ten.charAt(0).toUpperCase()}</span>
                          <div>
                            <strong>{[user.ho, user.ten].filter(Boolean).join(' ')}</strong>
                            <small>
                              Tạo {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="access-contact-cell">
                        <strong>{user.email}</strong>
                        <small>{user.phoneNumber}</small>
                      </td>
                      <td><span className="role-chip">{user.role}</span></td>
                      <td>
                        <span className={`status-badge ${user.isEmailVerified ? 'active' : 'inactive'}`}>
                          {user.isEmailVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                          {user.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions access-row-actions">
                          <button
                            type="button"
                            aria-label={`Sửa tài khoản ${user.email}`}
                            title="Sửa tài khoản"
                            onClick={() => openUser(user)}
                          >
                            <EditIcon />
                          </button>
                          <button
                            type="button"
                            className="danger"
                            aria-label={`Xóa tài khoản ${user.email}`}
                            title={deletingUserId === user.id ? 'Đang xóa tài khoản' : 'Xóa tài khoản'}
                            disabled={deletingUserId === user.id}
                            onClick={() => void removeUser(user)}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>Trang {page}/{totalPages} • {totalCount} kết quả</span>
              <div>
                <button
                  type="button"
                  aria-label="Trang trước"
                  disabled={page <= 1}
                  onClick={() => void loadUsers(page - 1, keyword, userRoleFilter, userStatusFilter)}
                >
                  <ArrowLeftIcon />
                  <span>Trước</span>
                </button>
                <button
                  type="button"
                  aria-label="Trang sau"
                  disabled={page >= totalPages}
                  onClick={() => void loadUsers(page + 1, keyword, userRoleFilter, userStatusFilter)}
                >
                  <span>Sau</span>
                  <ArrowRightIcon />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="access-filter-band role-filter-band">
            <label className="access-search-field">
              <span className="sr-only">Tìm kiếm vai trò</span>
              <SearchIcon />
              <input
                value={roleKeyword}
                onChange={(event) => setRoleKeyword(event.target.value)}
                placeholder="Tìm tên vai trò hoặc mô tả..."
              />
              {roleKeyword && (
                <button
                  type="button"
                  className="access-clear-button"
                  aria-label="Xóa từ khóa tìm vai trò"
                  onClick={() => setRoleKeyword('')}
                >
                  <CloseIcon />
                </button>
              )}
            </label>
          </div>

          <div className="access-result-row">
            <span>Tìm thấy <strong>{filteredRoles.length}</strong> vai trò</span>
          </div>

          <div className="access-table-panel role-table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Tên vai trò</th>
                    <th>Mô tả &amp; phạm vi quyền hạn</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="empty-state">Đang tải vai trò...</td></tr>
                  ) : filteredRoles.length === 0 ? (
                    <tr><td colSpan={4} className="empty-state">Không có vai trò phù hợp.</td></tr>
                  ) : filteredRoles.map((role) => (
                    <tr key={role.id}>
                      <td>
                        <div className="access-role-identity">
                          <span><ShieldIcon /></span>
                          <div>
                            <strong>{role.displayName}</strong>
                            <small>Mã hệ thống: {role.name}</small>
                          </div>
                        </div>
                      </td>
                      <td className="access-role-description">
                        {role.description || 'Chưa có mô tả cho vai trò này.'}
                      </td>
                      <td>
                        <span className={`status-badge ${role.isActive ? 'active' : 'inactive'}`}>
                          {role.isActive ? 'Có hiệu lực' : 'Vô hiệu'}
                        </span>
                      </td>
                      <td>
                        <div className="role-card-actions access-row-actions">
                          <button
                            type="button"
                            aria-label={`Phân quyền cho ${role.displayName}`}
                            title="Phân quyền"
                            onClick={() => void openPermissions(role)}
                          >
                            <KeyIcon />
                          </button>
                          <button
                            type="button"
                            aria-label={`Sửa vai trò ${role.displayName}`}
                            title="Sửa vai trò"
                            onClick={() => openEditRole(role)}
                          >
                            <EditIcon />
                          </button>
                          {role.isActive && role.name !== 'Admin' && (
                            <button
                              type="button"
                              className="danger"
                              aria-label={`Vô hiệu hóa vai trò ${role.displayName}`}
                              title="Vô hiệu hóa vai trò"
                              onClick={() => void disableRole(role)}
                            >
                              <TrashIcon />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {userModalOpen && userForm && (
        <div
          className="modal-backdrop"
          onMouseDown={() => !saving && setUserModalOpen(false)}
        >
          <div
            className="employee-modal access-modal account-access-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2 id="account-modal-title">Cập nhật tài khoản</h2>
                <p>Thay đổi thông tin, vai trò và trạng thái đăng nhập.</p>
              </div>
              <button
                type="button"
                aria-label="Đóng cửa sổ cập nhật tài khoản"
                onClick={() => setUserModalOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <form className="employee-form access-modal-form" onSubmit={saveUser}>
              <label>
                Họ
                <input
                  value={userForm.ho}
                  onChange={(event) => setUserForm({
                    ...userForm,
                    ho: event.target.value,
                  })}
                />
              </label>
              <label>
                Tên
                <input
                  required
                  value={userForm.ten}
                  onChange={(event) => setUserForm({
                    ...userForm,
                    ten: event.target.value,
                  })}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(event) => setUserForm({
                    ...userForm,
                    email: event.target.value,
                  })}
                />
              </label>
              <label>
                Số điện thoại
                <input
                  required
                  value={userForm.phoneNumber}
                  onChange={(event) => setUserForm({
                    ...userForm,
                    phoneNumber: event.target.value,
                  })}
                />
              </label>
              <label>
                Vai trò
                <select
                  value={userForm.role}
                  onChange={(event) => setUserForm({
                    ...userForm,
                    role: event.target.value,
                  })}
                >
                  {activeRoles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="access-status-field wide-field">
                <legend>Trạng thái tài khoản</legend>
                <div>
                  <button
                    type="button"
                    aria-pressed={userForm.isActive}
                    className={userForm.isActive ? 'active' : ''}
                    onClick={() => setUserForm({ ...userForm, isActive: true })}
                  >
                    Đang hoạt động
                  </button>
                  <button
                    type="button"
                    aria-pressed={!userForm.isActive}
                    className={!userForm.isActive ? 'inactive active' : ''}
                    onClick={() => setUserForm({ ...userForm, isActive: false })}
                  >
                    Đã khóa
                  </button>
                </div>
              </fieldset>
              <div className="security-note wide-field">
                Thay đổi email, vai trò hoặc trạng thái sẽ thu hồi các phiên đăng nhập hiện tại của tài khoản.
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setUserModalOpen(false)}>Hủy</button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {roleModalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={() => !saving && setRoleModalOpen(false)}
        >
          <div
            className="employee-modal access-modal role-access-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2 id="role-modal-title">
                  {roleForm.id ? 'Cập nhật vai trò' : 'Thêm vai trò mới'}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Đóng cửa sổ vai trò"
                onClick={() => setRoleModalOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <form className="employee-form access-modal-form" onSubmit={saveRole}>
              <label>
                <span>Tên hệ thống <b>*</b></span>
                <input
                  required
                  disabled={Boolean(roleForm.id)}
                  placeholder="Ví dụ: FloorSupervisor"
                  value={roleForm.name}
                  onChange={(event) => setRoleForm({
                    ...roleForm,
                    name: event.target.value.replace(/\s+/g, ''),
                  })}
                />
              </label>
              <label>
                <span>Tên hiển thị <b>*</b></span>
                <input
                  required
                  placeholder="Ví dụ: Giám sát sảnh"
                  value={roleForm.displayName}
                  onChange={(event) => setRoleForm({
                    ...roleForm,
                    displayName: event.target.value,
                  })}
                />
              </label>
              <label className="wide-field">
                <span>Mô tả chi tiết</span>
                <textarea
                  rows={4}
                  placeholder="Mô tả nhiệm vụ và phạm vi quyền hạn của vai trò..."
                  value={roleForm.description}
                  onChange={(event) => setRoleForm({
                    ...roleForm,
                    description: event.target.value,
                  })}
                />
              </label>
              {roleForm.id && (
                <fieldset className="access-status-field wide-field">
                  <legend>Trạng thái vai trò</legend>
                  <div>
                    <button
                      type="button"
                      aria-pressed={roleForm.isActive}
                      className={roleForm.isActive ? 'active' : ''}
                      onClick={() => setRoleForm({ ...roleForm, isActive: true })}
                    >
                      Có hiệu lực
                    </button>
                    <button
                      type="button"
                      aria-pressed={!roleForm.isActive}
                      className={!roleForm.isActive ? 'inactive active' : ''}
                      onClick={() => setRoleForm({ ...roleForm, isActive: false })}
                    >
                      Vô hiệu
                    </button>
                  </div>
                </fieldset>
              )}
              <div className="modal-actions">
                <button type="button" onClick={() => setRoleModalOpen(false)}>Hủy</button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu vai trò'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {permissionModalOpen && selectedRole && (
        <div
          className="modal-backdrop"
          onMouseDown={() => !saving && setPermissionModalOpen(false)}
        >
          <div
            className="permission-modal access-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="permission-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2 id="permission-modal-title">Phân quyền: {selectedRole.displayName}</h2>
                <p>Chọn các quyền được phép sử dụng trong hệ thống.</p>
              </div>
              <button
                type="button"
                aria-label="Đóng cửa sổ phân quyền"
                onClick={() => setPermissionModalOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="permission-toolbar">
              <input
                value={permissionSearch}
                onChange={(event) => setPermissionSearch(event.target.value)}
                placeholder="Tìm mã quyền, tên quyền hoặc nhóm..."
              />
              <span>
                {permissions.filter((item) => item.isSelected).length}/{permissions.length} quyền
              </span>
            </div>
            <div className="permission-groups">
              {permissionGroups.length === 0 ? (
                <div className="permission-empty-state">
                  {permissions.length === 0
                    ? 'Backend không trả về quyền hợp lệ. Hãy đồng bộ vai trò hệ thống rồi mở lại.'
                    : 'Không có quyền phù hợp với nội dung tìm kiếm.'}
                </div>
              ) : permissionGroups.map(([group, items]) => (
                <section key={group}>
                  <div className="permission-group-heading">
                    <h3>{group}</h3>
                    <button
                      type="button"
                      onClick={() => {
                        const ids = new Set(items.map((item) => item.permissionId))
                        const shouldSelect = items.some((item) => !item.isSelected)
                        setPermissions((current) => current.map((item) => (
                          ids.has(item.permissionId)
                            ? { ...item, isSelected: shouldSelect }
                            : item
                        )))
                      }}
                    >
                      {items.every((item) => item.isSelected)
                        ? 'Bỏ chọn nhóm'
                        : 'Chọn cả nhóm'}
                    </button>
                  </div>
                  {items.map((permission) => (
                    <label className="permission-item" key={permission.permissionId}>
                      <input
                        type="checkbox"
                        checked={permission.isSelected}
                        onChange={(event) => setPermissions((current) => (
                          current.map((item) => (
                            item.permissionId === permission.permissionId
                              ? { ...item, isSelected: event.target.checked }
                              : item
                          ))
                        ))}
                      />
                      <div>
                        <strong>{permission.permissionName}</strong>
                        <code>{permission.permissionCode}</code>
                      </div>
                    </label>
                  ))}
                </section>
              ))}
            </div>
            <div className="permission-actions">
              <button type="button" onClick={() => setPermissionModalOpen(false)}>Hủy</button>
              <button
                type="button"
                className="primary-button"
                disabled={saving || permissions.length === 0}
                onClick={() => void savePermissions()}
              >
                {saving ? 'Đang lưu...' : 'Lưu phân quyền'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
