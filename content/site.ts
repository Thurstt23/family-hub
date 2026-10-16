// ============================================================================
// SITE CONTENT: the one file to edit for names, wording and the family story.
//
// Everything a visitor reads on the public pages, in the browser tab, in link
// previews and at the top of every email comes from here. Change the text
// between the quotes, keep the commas and brackets. See docs/CONTENT_GUIDE.md.
//
// Things that are NOT in this file because they live in the database and are
// edited from the admin console: branches, events, announcements, albums,
// membership tier names, prices and benefits.
// ============================================================================

export const site = {
  /** Short name: browser tab, header wordmark, emails. */
  name: 'Martin Sawyer Reunion',
  /** App name on a phone home screen; keep under 15 characters. */
  shortName: 'Martin Sawyer',
  /** The family as a proper noun, used in headings and the footer. */
  familyName: 'The Martin Sawyer Family',
  /** The family's name inside a sentence: "members of the ___ family". */
  familyNameInSentence: 'Martin Sawyer',
  /** One line under the big heading and in link previews. */
  tagline: 'Six branches. Four generations. One register.',
  /** Who answers questions. Shown on the privacy and terms pages. */
  contactEmail: 'hello@example.com',

  home: {
    /** Small line above the big heading. */
    heroNote: 'Kept since 1961 · Savannah, Georgia',
    /** The big heading, in two lines. The second line is set in italic gold. */
    heroTitle: ['The Martin Sawyer', 'Family'],
    /**
     * Optional photograph behind the heading. Put the file in /public (for
     * example public/hero.jpg, at least 2000px wide) and set src to '/hero.jpg'.
     * Leave src as null to show the drawn botanical illustration instead.
     */
    heroImage: { src: null as string | null, alt: 'The family gathered on the steps of the old house, 1961' },
    /** Shown in the row of figures under the heading. Branch and member counts come from the database. */
    generations: 4,
    storyHeading: 'A register kept by many hands',
    /** Two or three short paragraphs beside the drawing of the register. */
    story: [
      'Since 1961, our family has kept a register of every birth, marriage, and passing. What started as a single leather-bound ledger in Savannah has grown into a living record connecting hundreds of descendants across the country.',
      'This hub keeps that record going: so our history is not lost, our connections stay close, and the next generation knows exactly where they come from.',
    ],
    branchesHeading: 'The branches',
    branchesIntro: 'Every member belongs to a branch, and every branch has a steward who welcomes new names into the register.',
    joinHeading: 'Joining takes a few minutes',
    /** A short line set large near the bottom of the home page, with who said it. */
    quote: {
      text: 'We are, each of us, a line in a book someone else began.',
      attribution: 'From the first page of the register',
    },
  },

  about: {
    title: 'About our family',
    description: 'The history and origins of the family register.',
    intro: [
      'The family traces its shared ledger back to 1961, when the first register was bound in Savannah, Georgia. What began as a simple book of names and dates has grown into a living record.',
      'Today the family spans six branches and four generations. This hub exists so that distance does not weaken the connection, and so our shared history is kept for the generations to come.',
    ],
    sections: [
      {
        heading: 'The register',
        paragraphs: [
          'Membership is looked after by family stewards, one or two for each branch. We value privacy over publicity: the directory, photographs and stories are for family only.',
        ],
      },
      {
        heading: 'The reunion',
        paragraphs: [
          'Every few years the branches gather in one place. Dates, places and how to RSVP are on the events page.',
        ],
      },
    ],
  },

  join: {
    title: 'Join the register',
    description: 'Request access to the family register.',
    intro:
      'The register is a private directory for descendants and relatives of the family. A family steward approves every request, to keep the directory among family.',
    steps: [
      'Create an account with your own email address.',
      'Confirm your email address from the message we send.',
      'Tell us your name and which branch of the family you belong to.',
      'A steward for your branch reviews your request, usually within a few days.',
    ],
    membershipIntro:
      'Joining is free. Members who want to help with the cost of the site and the reunion can choose a paid membership after they are approved.',
  },
} as const
