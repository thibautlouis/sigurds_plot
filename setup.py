# yapf: disable
from setuptools import find_packages, setup

setup(name="sigurds_plot",
      version="0.0.1",
      packages=find_packages(),
      description="Scripts to make Sigurd's plots",
      url="https://github.com/thibautlouis/sigurds_plot",
      author="Sigurd Naess, Thibaut Louis, Xavier Garrido",
      classifiers=[
          "Intended Audience :: Science/Research",
          "Topic :: Scientific/Engineering :: Astronomy",
          "Operating System :: OS Independent",
          "Programming Language :: Python :: 3.7"
      ],
      install_requires=["pspy"],
      entry_points={
          "console_scripts": ["make_sigurds_plot=sigurds_plot.make_sigurds_plot:main"],
      })
