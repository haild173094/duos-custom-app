import { useEffect, useState } from 'preact/hooks';

export default function CsvUploadSummary({ lineItems = [], setLineItems, errors = [], children, processingCsvData = false, contents }) {
  const [showSummary, setShowSummary] = useState(true);
  const [currentLineItems, setCurrentLineItems] = useState([]);
  const [pagination, setPagination] = useState({totalPage: 1, currentPage: 1, perPage: 5});

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(lineItems.length / pagination.perPage));

    const validCurrentPage = lineItems.length === 0 ? 1 : Math.min(pagination.currentPage, totalPages);

    setPagination((prevState) => ({
      ...prevState,
      totalPage: totalPages,
      currentPage: validCurrentPage,
    }));

    const currentPageLineItems = lineItems.slice(
      (validCurrentPage - 1) * pagination.perPage,
      validCurrentPage * pagination.perPage
    );
    setCurrentLineItems(currentPageLineItems);
  }, [lineItems, pagination.perPage, pagination.currentPage]);


  const handlePageChange = (page: number) => {
    if (page < 1 || page > pagination.totalPage) return;
    setPagination((prevState) => ({
      ...prevState,
      currentPage: page,
    }));
  };

  const removeLineItem = (item: any) => {
    const filteredLineItems = lineItems.filter(
      (p: { variantId: any }) => p.variantId !== item.variantId
    );

    setLineItems(filteredLineItems);
  };

  return (
    <>
      {
        processingCsvData ? <s-spinner/> : null
      }
      {
        currentLineItems.length
          ?
          <s-stack direction="block" padding="base none" alignContent='center'>
            <s-grid gridTemplateColumns="1fr 1fr" padding="base none">
              <s-stack>
                <s-heading>
                  {contents.order_summary}
                </s-heading>
              </s-stack>
              <s-clickable onClick={() => {setShowSummary(!showSummary)}}>
                <s-stack direction='inline' justifyContent={'end'} alignItems="end" gap="small">
                  <s-text tone="custom">
                    {showSummary ? contents.hide_summary : contents.show_summary}
                  </s-text>
                  <s-icon tone="custom" type={showSummary ? 'chevron-up' : 'chevron-down'}/>
                </s-stack>
              </s-clickable>
            </s-grid>

            {
              showSummary
                ?
                <s-stack direction="block">
                  <s-grid gridTemplateColumns="auto 15% 15% 10%" border='base base auto' borderStyle="auto" padding="base none">
                    <s-stack padding="base" justifyContent={'center'} alignContent={'center'}>
                      <s-text type="strong">{contents.product}</s-text>
                    </s-stack>
                    <s-stack padding={'base none'} justifyContent={'center'} alignItems={'center'}>
                      <s-text type="strong">{contents.quantity}</s-text>
                    </s-stack>
                    <s-stack padding={'base none'} justifyContent={'center'} alignItems={'center'}>
                      <s-text type="strong">{contents.available_stock}</s-text>
                    </s-stack>
                    <s-stack padding={'base none'} justifyContent={'center'} alignItems={'center'}>
                      <s-text type="strong">{contents.actions}</s-text>
                    </s-stack>
                  </s-grid>
                  {
                    currentLineItems.map((lineItem, index) => {
                      return (
                        <s-stack direction="block" border='none base' key={index.toString()}>
                          <s-grid gridTemplateColumns="auto 15% 15% 10%" border="base base auto" borderStyle='none auto auto auto'>
                            <s-stack padding="base" justifyContent={'center'} alignContent={'center'}>
                              {
                                lineItem?.errors.length
                                  ?
                                  <s-banner tone={'critical'}>
                                    <s-text>{`${lineItem.productName} ${lineItem.variantName === 'Default Title' ? '' : `- ${lineItem.variantName}`}`}</s-text>
                                  </s-banner>
                                  :
                                  <s-text>{`${lineItem.productName} ${lineItem.variantName === 'Default Title' ? '' : `- ${lineItem.variantName}`}`}</s-text>
                              }
                            </s-stack>
                            {/*<View padding={'base'} inlineAlignment={'start'} blockAlignment={'center'}>*/}
                            {/*  <Text>{`${lineItem.productName} - ${lineItem.variantName}`}</Text>*/}
                            {/*</View>*/}
                            <s-stack padding={'base none'} justifyContent={'center'} alignItems={'center'}>
                              <s-number-field
                                value={lineItem.quantity}
                                min={lineItem.minimum}
                                label={''}
                                disabled={true}
                              />
                            </s-stack>
                            <s-stack padding={'base none'} justifyContent={'center'} alignItems={'center'}>
                              <s-text>{lineItem.availableStock}</s-text>
                            </s-stack>
                            <s-stack padding={'base none'} justifyContent={'center'} alignItems={'center'}>
                              <s-clickable onClick={() => {
                                removeLineItem(lineItem);
                              }}>
                                <s-icon type={'delete'}/>
                              </s-clickable>
                            </s-stack>
                          </s-grid>
                          {/*{*/}
                          {/*  lineItem?.errors.length*/}
                          {/*  ?*/}
                          {/*    <InlineLayout columns={['fill']} padding={'base'}>*/}
                          {/*      <Banner status={'critical'}>*/}
                          {/*        <BlockStack>*/}
                          {/*          {*/}
                          {/*            lineItem.errors.map((e: any, i: any) => {*/}
                          {/*              return <Text key={i.toString()}>{e.errorText}</Text>*/}
                          {/*            })*/}
                          {/*          }*/}
                          {/*        </BlockStack>*/}
                          {/*      </Banner>*/}
                          {/*    </InlineLayout>*/}
                          {/*    :*/}
                          {/*    null*/}
                          {/*}*/}
                        </s-stack>
                      );
                    })
                  }
                </s-stack>
                :
                null
            }

            <s-grid gridTemplateColumns='1fr 1fr'>
              <s-stack direction='block'>
                {children}
              </s-stack>
              {
                showSummary
                  ?
                  <s-stack direction="inline" justifyContent={'end'} alignItems={'center'} alignContent="center" gap="small">
                    <s-button variant={'secondary'} onClick={() => {
                      handlePageChange(pagination.currentPage - 1)
                    }}>
                      <s-icon type={'chevron-left'}/>
                    </s-button>
                    <s-text>
                      {pagination.currentPage} of {pagination.totalPage}
                    </s-text>
                    <s-button variant={'secondary'} onClick={() => {
                      handlePageChange(pagination.currentPage + 1)
                    }}>
                      <s-icon type={'chevron-right'}/>
                    </s-button>
                  </s-stack>
                  :
                  null
              }
            </s-grid>
          </s-stack>
          :
          null
      }
    </>
  );
}
