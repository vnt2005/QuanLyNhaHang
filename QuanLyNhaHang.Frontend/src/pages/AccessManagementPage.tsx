import { useAutoDismissMessage } from '../design-system/useAutoDismissMessage'
import { confirmAction } from '../design-system/confirmDialog'
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
} from '../api/access'

const emptyRoleForm: RoleForm = {
  name: '',
  displayName: '',
  description: '',
  isActive: true,
}

export default function AccessManagementPage() {
  const [tab, setTab] = useState<'users' | 'roles'>('users')
  const [users, setUsers] = useState<UserAccount[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [keyword, setKeyword] = useState('')
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

  async function loadUsers(targetPage = page, search = keyword) {
    setLoading(true)
    setError('')
    try {
      const result = await getUsers(search, targetPage, 10)
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
      <div className="page-toolbar">
        <div>
          <h2>Tài khoản & phân quyền</h2>
          <p>Quản lý tài khoản đăng nhập, vai trò và quyền truy cập hệ thống.</p>
        </div>
        {tab === 'roles' && (
          <div className="toolbar-actions">
            <button
              type="button"
              onClick={() => void synchronizeRoles()}
              disabled={saving}
            >
              Đồng bộ hệ thống
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={openCreateRole}
            >
              + Thêm vai trò
            </button>
          </div>
        )}
      </div>

      <div className="access-tabs">
        <button
          type="button"
          className={tab === 'users' ? 'active' : ''}
          onClick={() => setTab('users')}
        >
          Tài khoản ({totalCount})
        </button>
        <button
          type="button"
          className={tab === 'roles' ? 'active' : ''}
          onClick={() => setTab('roles')}
        >
          Vai trò ({roles.length})
        </button>
      </div>

      {message && <div className="inline-alert success">{message}</div>}
      {error && <div className="inline-alert error">{error}</div>}

      {tab === 'users' ? (
        <div className="table-card">
          <form
            className="table-filters"
            onSubmit={(event) => {
              event.preventDefault()
              void loadUsers(1, keyword)
            }}
          >
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm tên, email, số điện thoại hoặc vai trò..."
            />
            <button type="submit">Tìm kiếm</button>
            {keyword && (
              <button
                type="button"
                onClick={() => {
                  setKeyword('')
                  void loadUsers(1, '')
                }}
              >
                Xóa lọc
              </button>
            )}
          </form>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Liên hệ</th>
                  <th>Vai trò</th>
                  <th>Xác minh email</th>
                  <th>Trạng thái</th>
                  <th />
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
                    <td>
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
                      <div className="row-actions">
                        <button type="button" onClick={() => openUser(user)}>Sửa</button>
                        <button
                          type="button"
                          className="danger"
                          disabled={deletingUserId === user.id}
                          onClick={() => void removeUser(user)}
                        >
                          {deletingUserId === user.id ? 'Đang xóa...' : 'Xóa'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>Trang {page}/{totalPages}</span>
            <div>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => void loadUsers(page - 1, keyword)}
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => void loadUsers(page + 1, keyword)}
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="role-grid">
          {loading ? (
            <div className="empty-role-state">Đang tải vai trò...</div>
          ) : roles.map((role) => (
            <article className="role-card" key={role.id}>
              <div className="role-card-heading">
                <div className="role-symbol">
                  {role.displayName.charAt(0).toUpperCase()}
                </div>
                <span className={`status-badge ${role.isActive ? 'active' : 'inactive'}`}>
                  {role.isActive ? 'Hoạt động' : 'Vô hiệu'}
                </span>
              </div>
              <h3>{role.displayName}</h3>
              <code>{role.name}</code>
              <p>{role.description || 'Chưa có mô tả cho vai trò này.'}</p>
              <div className="role-card-actions">
                <button type="button" onClick={() => void openPermissions(role)}>
                  Phân quyền
                </button>
                <button type="button" onClick={() => openEditRole(role)}>Sửa</button>
                {role.isActive && role.name !== 'Admin' && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => void disableRole(role)}
                  >
                    Vô hiệu
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {userModalOpen && userForm && (
        <div
          className="modal-backdrop"
          onMouseDown={() => !saving && setUserModalOpen(false)}
        >
          <div
            className="employee-modal access-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2>Cập nhật tài khoản</h2>
                <p>Thay đổi thông tin, vai trò và trạng thái đăng nhập.</p>
              </div>
              <button type="button" onClick={() => setUserModalOpen(false)}>×</button>
            </div>
            <form className="employee-form" onSubmit={saveUser}>
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
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={userForm.isActive}
                  onChange={(event) => setUserForm({
                    ...userForm,
                    isActive: event.target.checked,
                  })}
                />
                Tài khoản đang hoạt động
              </label>
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
            className="employee-modal access-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2>{roleForm.id ? 'Cập nhật vai trò' : 'Thêm vai trò'}</h2>
                <p>Vai trò sẽ được dùng khi tạo hoặc cập nhật tài khoản.</p>
              </div>
              <button type="button" onClick={() => setRoleModalOpen(false)}>×</button>
            </div>
            <form className="employee-form" onSubmit={saveRole}>
              <label>
                Tên hệ thống
                <input
                  required
                  disabled={Boolean(roleForm.id)}
                  value={roleForm.name}
                  onChange={(event) => setRoleForm({
                    ...roleForm,
                    name: event.target.value.replace(/\s+/g, ''),
                  })}
                />
              </label>
              <label>
                Tên hiển thị
                <input
                  required
                  value={roleForm.displayName}
                  onChange={(event) => setRoleForm({
                    ...roleForm,
                    displayName: event.target.value,
                  })}
                />
              </label>
              <label className="wide-field">
                Mô tả
                <textarea
                  rows={4}
                  value={roleForm.description}
                  onChange={(event) => setRoleForm({
                    ...roleForm,
                    description: event.target.value,
                  })}
                />
              </label>
              {roleForm.id && (
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={roleForm.isActive}
                    onChange={(event) => setRoleForm({
                      ...roleForm,
                      isActive: event.target.checked,
                    })}
                  />
                  Vai trò đang hoạt động
                </label>
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
            className="permission-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2>Phân quyền: {selectedRole.displayName}</h2>
                <p>Chọn các quyền được phép sử dụng trong hệ thống.</p>
              </div>
              <button type="button" onClick={() => setPermissionModalOpen(false)}>×</button>
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
