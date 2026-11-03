###############################################################################
#  terminal-retro — shell aislada                                             #
#                                                                             #
#  Carga TU ~/.zshrc entero (zoxide, bat, fzf, alias, funciones, nvm...)       #
#  y después desactiva SOLO el prompt de starship, dejando uno plano.          #
#  Tu Ghostty no se entera de nada: allí starship sigue igual.                 #
###############################################################################

# Marca para que puedas poner condicionales en tu ~/.zshrc si algún día quieres
# que algo se comporte distinto aquí:  if [[ -n $TERMINAL_RETRO ]]; then ...
export TERMINAL_RETRO=1

# PATH base, porque esta shell no es de login y no lee ~/.zprofile.
[ -x /opt/homebrew/bin/brew ] && eval "$(/opt/homebrew/bin/brew shellenv)"

# Evita el prompt instantáneo de powerlevel10k si algún día lo usas.
typeset -g POWERLEVEL9K_INSTANT_PROMPT=off

#------------------------------------------------------------------- tu config
[ -f "$HOME/.zshrc" ] && source "$HOME/.zshrc"

#--------------------------------------------------------- fuera prompt bonito
# starship repinta el prompt en cada precmd: hay que quitarle los hooks,
# no basta con reasignar PROMPT.
# (el hook se llama prompt_starship_precmd en las versiones nuevas, por eso el
#  patron con comodines en vez del nombre exacto)
precmd_functions=("${(@)precmd_functions:#*starship*}")
preexec_functions=("${(@)preexec_functions:#*starship*}")
for f in ${(k)functions}; do
  [[ $f == *starship* || $f == *p10k* || $f == *powerlevel* ]] && unfunction $f
done
unset STARSHIP_SESSION_KEY STARSHIP_START_TIME

# Lo mismo para powerlevel10k, por si aparece.
precmd_functions=("${(@)precmd_functions:#*p10k*}")
precmd_functions=("${(@)precmd_functions:#*powerlevel*}")

# Prompt plano, blanco, sin iconos.
PROMPT='%~ %# '
RPROMPT=''

# Tu alias 'rterminal' recarga ~/.zshrc, lo que volveria a activar starship aqui.
# Se redefine para que recargue este fichero (tu config + la limpieza de prompt).
unalias rterminal 2>/dev/null
rterminal() { source "$ZDOTDIR/.zshrc" }
