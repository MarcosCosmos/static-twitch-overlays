# static-twitch-overlays

A collection of base files for twitch overlays. These are available as static files (that is, using static web hosting, which therefore run client-side only) for public use.

# Notable changes (non-comprehensive)
data locks/leases are no longer inherently required to be wrapped around anything that may change a value (though saves still use promises to implement their cooldown), partially due to this being redundant in a re-entrant language. Whilst this may be neccessary in some future cases, given that it is not internally neccessary to the existing modules, there should be sufficient functionality provided to encapsulate existing modules as neccessary by intercepting their listeners and wrapping the original listeners with a hold on a lock.