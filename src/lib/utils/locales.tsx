import React from "react";

export const price = (price: number, language: string = "en") => {
  switch (language) {
    case "en":
      return (
        <>
          <span className="icon-saudi_riyal" />
          {price}
        </>
      );
    case "ar":
      return (
        <>
          {price}
          <span className="icon-saudi_riyal" />
        </>
      );
    default:
      return (
        <>
          <span className="icon-saudi_riyal" />
          {price}
        </>
      );
  }
};
