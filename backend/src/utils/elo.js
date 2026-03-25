const K = 32;

/**
 * Calculate new ELO ratings after a duel.
 * @param {number} winnerRating  - Current ELO of the winner
 * @param {number} loserRating   - Current ELO of the loser
 * @returns {{ winnerNew: number, loserNew: number, delta: number }}
 */
function calculateElo(winnerRating, loserRating) {
    const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    const expectedLoser  = 1 - expectedWinner;

    const winnerNew = Math.round(winnerRating + K * (1 - expectedWinner));
    const loserNew  = Math.round(loserRating  + K * (0 - expectedLoser));

    const delta = winnerNew - winnerRating; // how many points changed hands

    return { winnerNew, loserNew, delta };
}

module.exports = { calculateElo };