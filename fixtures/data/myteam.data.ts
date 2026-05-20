export interface TeamMemberData {
  name: string;
}

export const teamData = {
  primaryMember: {
    name: 'Amit Bhardwaj',
  },
  secondaryMember: {
    name: 'pushpendra singh',
  },
} satisfies Record<string, TeamMemberData>;
