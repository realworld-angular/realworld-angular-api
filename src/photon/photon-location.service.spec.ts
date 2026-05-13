import { BadRequestException } from '@nestjs/common';
import { parseCommaJoinedStreetCityCountry } from './photon-location.service';

describe('parseCommaJoinedStreetCityCountry', () => {
  it('splits street, city, country', () => {
    expect(parseCommaJoinedStreetCityCountry('12 Main, Paris, France')).toEqual(
      {
        street: '12 Main',
        city: 'Paris',
        country: 'France',
      },
    );
  });

  it('allows commas inside the street segment', () => {
    expect(
      parseCommaJoinedStreetCityCountry('Suite 1, 100 Main St, Naples, Italy'),
    ).toEqual({
      street: 'Suite 1, 100 Main St',
      city: 'Naples',
      country: 'Italy',
    });
  });

  it('rejects fewer than three comma-separated parts', () => {
    expect(() => parseCommaJoinedStreetCityCountry('Only street')).toThrow(
      BadRequestException,
    );
  });
});
