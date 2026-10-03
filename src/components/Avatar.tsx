export default function Avatar({ name }: { name: string }) {
  return <div className="avatar">{name.slice(0, 1).toUpperCase()}</div>;
}
