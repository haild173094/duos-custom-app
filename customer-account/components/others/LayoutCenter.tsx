const LayoutCenter = ({ customAttributes, children } : {
  customAttributes?: Record<string, string>,
  children: React.ReactNode,
}) => {
  return (
    <s-grid
      justifyContent="center"
      alignItems="center"
      {...customAttributes}
    >
      {children}
    </s-grid>
  );
}

export default LayoutCenter;
