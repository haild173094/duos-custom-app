interface PaginationProps {
  pagination: {
    links: Array<{ label: string; active: boolean }>;
    prev: string | null;
    next: string | null;
    current_page: number;
  };
  onPageChange: (page: string) => void;
  loading?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({ pagination, onPageChange, loading = false }) => {
  const links = pagination.links?.reduce((acc, cur, index) => {
    if (index === 0 || index === pagination.links.length - 1) {
      return acc;
    }
    return [...acc, cur];
  }, []) || [];

  const handlePageChange = (label: string) => {
    onPageChange(label);
  };

  const handlePrevPage = () => {
    onPageChange((pagination.current_page - 1).toString());
  };

  const handleNextPage = () => {
    onPageChange((pagination.current_page + 1).toString());
  };

  return (
    <s-stack direction='inline' alignItems='center' justifyContent='center' gap='small-300'>
      <s-button
        variant='secondary'
        disabled={loading || !pagination.prev}
        onClick={handlePrevPage}
      >
        <s-icon type='chevron-left' />
      </s-button>
      {links.map((link) => (
        <s-button
          key={link.label}
          variant={link.active ? 'primary' : 'secondary'}
          disabled={loading}
          onClick={() => handlePageChange(link.label)}
        >
          {link.label}
        </s-button>
      ))}
      <s-button
        variant='secondary'
        disabled={loading || !pagination.next}
        onClick={handleNextPage}
      >
        <s-icon type='chevron-right' />
      </s-button>
    </s-stack>
  );
};

export { Pagination };
