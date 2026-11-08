export interface DataTableColumn<Row> {
  align?: "end" | "start";
  header: string;
  key: string;
  render: (row: Row) => React.ReactNode;
}

export function DataTable<Row>({
  caption,
  columns,
  getRowKey,
  rows,
}: {
  caption: string;
  columns: DataTableColumn<Row>[];
  getRowKey: (row: Row) => React.Key;
  rows: Row[];
}) {
  return (
    <div className="data-table-frame">
      <table className="data-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                className={
                  column.align === "end" ? "data-table__cell--end" : undefined
                }
                key={column.key}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td
                  className={
                    column.align === "end" ? "data-table__cell--end" : undefined
                  }
                  key={column.key}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
