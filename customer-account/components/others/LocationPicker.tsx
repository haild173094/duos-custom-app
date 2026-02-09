import { useEffect, useState, useMemo, useCallback, useRef, useContext } from 'react'
import {
  useApi,
  BlockStack,
  Icon,
  Spinner,
  InlineStack,
  Modal,
  Pressable,
  TextField,
  View,
  ChoiceList,
  Choice,
  Text,
  useSessionToken,
} from '@shopify/ui-extensions-react/customer-account';
import { useShop } from '@app/customer-account/contexts/shop';
import { useCustomer } from '@app/customer-account/contexts/customer';
import { removeShopifyGidPrefix } from '@app/services';
import { QuickOrderContext } from '../../contexts';
import { useHttp } from '../../hook';
import { type ICompanyLocation } from '@app/types';

type Props = {
  modelValue: ICompanyLocation | undefined,
  setModelValue: (val: ICompanyLocation) => void,
  contents: Record<string, any>,
  disableFetchLocation?: boolean,
  initLocation?: boolean,
  defaultLocationId?: string,
  disabledChangeLocation?: boolean,
}

const LocationPicker: React.FC<Props> = ({
  modelValue,
  setModelValue,
  contents,
  disabledChangeLocation = false,
  disableFetchLocation = false,
  initLocation = true,
  defaultLocationId,
}) => {
  const { ui } = useApi();

  const { currentLocations } = useContext(QuickOrderContext);

  const shop = useShop();
  const {
    customer,
    updateCustomer,
  } = useCustomer();
  const sessionToken = useSessionToken();
  const { getCustomerLocations } = useHttp(() => sessionToken.get());

  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  // const [locations, setLocations] = useState([]);
  const locations = useRef<Record<string, any>[]>([]);
  const [filteredLocations, setFilteredLocation] = useState([]);

  const getLocationDetail = (locationId: string) => {
    const location = locations.current.find((location) => location.id === locationId);

    if (!location) return {};

    return {
      name: location.name,
      currency: location.currency,
      countryCode: location.countryCode,
    }
  };

  const updatemodelValue = (locationId: string) => {
    const newLocationData = {
      id: locationId,
      ...getLocationDetail(locationId),
    };

    setModelValue(newLocationData as ICompanyLocation);
  };

  // useLocation from parent call api to get locations
  useEffect(() => {
    if (currentLocations.length) {
      locations.current = currentLocations;
      setFilteredLocation(currentLocations);
    }
  }, [currentLocations]);

  useEffect(() => {
    // Fetch locations
    if (!shop || disableFetchLocation) {
      setIsLoadingLocation(false);
      return;
    }

    async function fetchLocations() {
      setIsLoadingLocation(true);

      try {
        if (!customer?.companyId || !shop.id || locations.current.length) {
          return;
        }

        const companyContactId = removeShopifyGidPrefix(customer.companyContactId, 'CompanyContact');
        const customerId = removeShopifyGidPrefix(customer.customerId, 'Customer');
        const shopId = shop.id;

        const locationRes = await getCustomerLocations({ customerId, shopId, companyContactId });

        const mapLocations = locationRes.data.nodes.map((item) => {
          const location = item.company_location;
          return {
            id: removeShopifyGidPrefix(location.id, 'CompanyLocation'),
            name: location.name,
            currency: location.currency,
            countryCode: location.shipping_address?.country_code,
          }
        });

        locations.current = mapLocations;
        setFilteredLocation(mapLocations);

        if (!modelValue && mapLocations.length && initLocation) {
          updatemodelValue(mapLocations[0].id);
        }

        if (defaultLocationId) {
          const defaultLocation = mapLocations.find((location) => location.id === defaultLocationId);
          if (defaultLocation) {
            updatemodelValue(defaultLocationId);
          }
        }
      } catch (error) {
        console.error('Failed to fetch locations', error);
      } finally {
        setIsLoadingLocation(false);
      }
    }

    fetchLocations();
  }, [shop, customer, disableFetchLocation]);

  const filterLocation = (keyword: string) => {
    let resultLocations = [];
    if (!keyword.trim()) {
      resultLocations = locations.current;
    } else {
      resultLocations = locations.current.filter(location =>
        location.name.toLowerCase().includes(keyword.toLowerCase())
      );
    }
    setFilteredLocation(resultLocations);
  }

  return(
    <View>
      {
        isLoadingLocation ?
          <Spinner/> :
          <Pressable
            disabled={disabledChangeLocation}
            overlay={
            <Modal
              id={'location-modal'}
              padding
              title={contents?.location_choose}
              onClose={() => {setFilteredLocation(locations.current)}}
            >
              <BlockStack>
                <TextField label={contents?.location_search_placeholder} onChange={(value) => {
                  filterLocation(value);
                }}/>
                <ChoiceList
                  name={'group-single'}
                  value={modelValue?.id}
                  onChange={(value: string) => {
                    updatemodelValue(value);
                    ui.overlay.close('location-modal');
                  }}
                >
                  {filteredLocations.map((location) => (
                    <Choice key={location.id} id={location.id}>{location.name}</Choice>
                  ))}
                </ChoiceList>
              </BlockStack>
            </Modal>
          }>
            <InlineStack spacing="tight">
              <Icon source={'marker'} />
              <Text appearance="accent">{modelValue?.name || contents?.location_select}</Text>
              <Icon source={'chevronDown'} appearance={'accent'}/>
            </InlineStack>
          </Pressable>
      }
    </View>
  );
}

export default LocationPicker;
