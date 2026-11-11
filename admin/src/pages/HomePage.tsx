import { Main } from "@strapi/design-system";
import { useIntl } from "react-intl";

import { getTranslation } from "../utils/getTranslation";

const HomePage = () => {
  const { formatMessage } = useIntl();

  return (
    <Main>
      <h1>{formatMessage({ id: getTranslation("home.welcome"), defaultMessage: "Welcome to Form Builder" })}</h1>
    </Main>
  );
};

export { HomePage };