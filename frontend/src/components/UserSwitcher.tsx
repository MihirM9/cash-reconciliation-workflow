import { useQuery } from "@tanstack/react-query";
import { fetchUsers } from "../api/cases.js";
import { getCurrentUserId, setCurrentUserId } from "../api/client.js";

export function UserSwitcher({ onChange }: { onChange: () => void }) {
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });
  const current = getCurrentUserId();

  return (
    <div className="user-switcher">
      <label htmlFor="user-switcher-select">Acting as</label>
      <select
        id="user-switcher-select"
        value={current ?? ""}
        onChange={(e) => {
          setCurrentUserId(e.target.value || null);
          onChange();
        }}
      >
        <option value="">-- select user --</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} · {u.role}
          </option>
        ))}
      </select>
    </div>
  );
}
